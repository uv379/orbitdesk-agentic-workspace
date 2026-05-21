/**
 * gateway.ts — WebSocket hub for streaming AI responses to the frontend.
 *
 * Why WebSockets and not regular HTTP for chat?
 * Regular HTTP is "request-response": client asks, server answers once.
 * AI responses are STREAMED — the model generates tokens one by one over several
 * seconds. WebSockets keep a persistent connection open so the server can push
 * data to the client as it arrives, without the client polling repeatedly.
 *
 * How it works end-to-end:
 *   1. mfe-chat connects to ws://localhost:8000/ws (the Socket.IO namespace)
 *   2. mfe-chat sends a "chat:send" event with { conversationId, content, token }
 *   3. This gateway verifies the token (same JWT check as AuthMiddleware)
 *   4. Gateway calls ai-core-service's streaming HTTP endpoint
 *   5. As ai-core-service streams tokens back, the gateway emits "chat:chunk" events
 *   6. When the stream ends, gateway emits "chat:done"
 *   7. If something fails, gateway emits "chat:error"
 *
 * NestJS WebSocket concepts:
 * - @WebSocketGateway() — marks this class as a Socket.IO server
 * - @WebSocketServer()  — injects the Socket.IO Server instance
 * - @SubscribeMessage() — like @Get()/@Post() but for WebSocket events
 * - @ConnectedSocket()  — injects the individual client socket
 * - @MessageBody()      — injects the event payload (like @Body() for HTTP)
 *
 * Socket.IO "rooms":
 * When a user connects, we join them to a room named after their user ID.
 * This lets us push messages to a specific user from anywhere in the codebase
 * via this.server.to(userId).emit('event', data) — useful for async notifications.
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Server, Socket } from 'socket.io'
import * as jwt from 'jsonwebtoken'
import axios from 'axios'

// Shape of the payload clients send with the "chat:send" event
interface ChatSendPayload {
  conversationId: string // which conversation this message belongs to
  content: string        // the user's message text
  token: string          // JWT — clients authenticate here since WS handshake headers
                         // are limited in browsers (can't set Authorization easily)
}

// The decoded JWT payload (same shape as AuthMiddleware)
interface JwtPayload {
  sub: string
  email: string
  role: string
  workspaceId: string
}

@WebSocketGateway({
  // Socket.IO namespace — clients connect to ws://localhost:8000/ws
  namespace: '/ws',
  cors: {
    // In production replace '*' with your frontend domain
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class StreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // @WebSocketServer() injects the Socket.IO Server instance.
  // We use it to broadcast to rooms (e.g. all tabs of the same user).
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(StreamingGateway.name)

  constructor(private readonly config: ConfigService) {}

  /**
   * handleConnection() is called automatically by Socket.IO whenever a new
   * client establishes a WebSocket connection.
   *
   * We verify the JWT here too — if the handshake doesn't include a valid token,
   * we disconnect the socket immediately. This prevents unauthenticated WebSocket
   * connections even if the HTTP middleware doesn't cover WS traffic.
   *
   * Clients send the token via socket.io handshake auth:
   *   const socket = io('http://localhost:8000/ws', { auth: { token: 'eyJ...' } })
   */
  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined

    if (!token) {
      this.logger.warn(`WS connection rejected: no token (socketId=${client.id})`)
      client.disconnect()
      return
    }

    const secret = this.config.get<string>('jwt.secret')
    try {
      const payload = jwt.verify(token, secret) as JwtPayload
      // Store the verified user data on the socket for use in event handlers.
      // socket.data is a plain object Socket.IO provides for per-connection state.
      client.data.user = payload

      // Join a room named after the user ID. This lets us push messages to
      // all open tabs of the same user (each tab = one socket, same room).
      client.join(payload.sub)

      this.logger.log(`WS connected: user=${payload.sub} socket=${client.id}`)
    } catch {
      this.logger.warn(`WS connection rejected: invalid token (socketId=${client.id})`)
      client.disconnect()
    }
  }

  /**
   * handleDisconnect() is called when a client disconnects (tab close, network drop, etc.)
   * We just log it. Socket.IO automatically removes the socket from all rooms.
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.user?.sub || 'unknown'
    this.logger.log(`WS disconnected: user=${userId} socket=${client.id}`)
  }

  /**
   * handleChatSend() handles the "chat:send" event from the frontend.
   *
   * Flow:
   * 1. Validate the user is still authenticated (socket.data.user was set in handleConnection)
   * 2. Call ai-core-service with the message, using responseType:'stream' to get tokens
   * 3. As each chunk arrives, emit "chat:chunk" back to the client
   * 4. When the stream ends, emit "chat:done"
   * 5. On any error, emit "chat:error"
   *
   * @SubscribeMessage('chat:send') — listens for events named "chat:send"
   * @MessageBody()                 — the event payload sent by the client
   * @ConnectedSocket()             — the individual socket that sent the event
   */
  @SubscribeMessage('chat:send')
  async handleChatSend(
    @MessageBody() payload: ChatSendPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    // Re-check authentication — the user object was set during handleConnection.
    const user = client.data.user as JwtPayload | undefined
    if (!user) {
      client.emit('chat:error', { message: 'Not authenticated' })
      return
    }

    const { conversationId, content } = payload
    const aiCoreUrl = this.config.get<string>('services.chat')

    this.logger.debug(`WS chat:send user=${user.sub} conv=${conversationId}`)

    try {
      // Call ai-core-service with stream:true (axios responseType: 'stream').
      // The service responds with Server-Sent Events (SSE) or chunked JSON.
      // Each chunk is a partial AI response token.
      const response = await axios.post(
        `${aiCoreUrl}/conversations/${conversationId}/messages/stream`,
        { content, userId: user.sub, workspaceId: user.workspaceId },
        {
          headers: {
            'x-user-id': user.sub,
            'x-workspace-id': user.workspaceId,
            'Content-Type': 'application/json',
          },
          // responseType: 'stream' means Axios gives us a Node.js ReadableStream
          // instead of waiting for the full response body.
          responseType: 'stream',
          timeout: 120_000, // AI responses can take a while — 2 minute timeout
        },
      )

      // response.data is a Node.js stream. 'data' events fire as chunks arrive.
      response.data.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        // Emit each token/chunk to the specific client that sent the message.
        // Only this socket receives it (not broadcast to the whole room).
        client.emit('chat:chunk', { conversationId, text })
      })

      // 'end' fires when the stream is fully consumed — the AI is done generating.
      response.data.on('end', () => {
        client.emit('chat:done', { conversationId })
        this.logger.debug(`WS chat:done user=${user.sub} conv=${conversationId}`)
      })

      // 'error' fires if the stream breaks mid-way (e.g. ai-core-service crashes).
      response.data.on('error', (err: Error) => {
        this.logger.error(`WS stream error for conv=${conversationId}: ${err.message}`)
        client.emit('chat:error', { conversationId, message: 'Streaming failed' })
      })
    } catch (err) {
      // Axios threw before even starting the stream (network error, timeout, etc.)
      this.logger.error(`WS chat:send failed for conv=${conversationId}: ${(err as Error).message}`)
      client.emit('chat:error', { conversationId, message: 'Failed to reach AI service' })
    }
  }
}
