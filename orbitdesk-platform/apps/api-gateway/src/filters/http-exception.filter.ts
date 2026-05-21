/**
 * http-exception.filter.ts — Global error handler for the entire gateway.
 *
 * What problem does this solve?
 * Without a filter, if any error is thrown anywhere in the app, NestJS sends
 * its own default error format. Downstream services might also return errors
 * in their own format. The frontend would receive inconsistent error shapes.
 *
 * This filter catches EVERY unhandled exception in the app and normalizes it
 * into one consistent shape:
 *   {
 *     "statusCode": 404,
 *     "message": "Conversation not found",
 *     "traceId": "abc-123-xyz"   ← matches X-Trace-Id header for debugging
 *   }
 *
 * How NestJS filters work:
 * - @Catch() with no arguments means "catch everything"
 * - ExceptionFilter interface requires a catch(exception, host) method
 * - ArgumentsHost gives us access to the raw request/response objects
 *
 * This filter is registered globally in main.ts via app.useGlobalFilters().
 * You never need to add it to individual controllers.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

// @Catch() with no args = catch ALL exceptions (both HttpException and unknown errors)
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  // Logger is NestJS's built-in logging utility.
  // The string 'HttpExceptionFilter' is a "context" label shown in log output.
  private readonly logger = new Logger(HttpExceptionFilter.name)

  /**
   * catch() is called automatically by NestJS whenever an exception is thrown.
   *
   * @param exception - The thrown error. Could be an HttpException (e.g. NotFoundException)
   *                    or any raw Error (e.g. network timeout, programming bug).
   * @param host      - Gives us access to the underlying HTTP request and response.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    // ArgumentsHost can wrap different contexts (HTTP, WebSocket, RPC).
    // switchToHttp() tells it we're in HTTP mode and gives us typed req/res.
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    // Determine the HTTP status code to send back:
    // - If it's a NestJS HttpException (like NotFoundException, UnauthorizedException),
    //   use the status it already has.
    // - If it's something unexpected (like a null reference error), use 500 Internal Server Error.
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    // Extract the human-readable error message:
    // - HttpException stores the message in getResponse(), which can be a string or object.
    // - Unknown errors are plain JS Error objects, so we use .message.
    // - If we can't figure it out, fall back to 'Internal server error'.
    let message: string
    if (exception instanceof HttpException) {
      const res = exception.getResponse()
      message = typeof res === 'string' ? res : (res as any).message || exception.message
    } else if (exception instanceof Error) {
      message = exception.message
    } else {
      message = 'Internal server error'
    }

    // Read the X-Trace-Id that RequestIdMiddleware stamped on this request.
    // Including it in the error response lets the frontend/developer correlate
    // this error with the specific request in logs across all services.
    const traceId = request.headers['x-trace-id'] as string | undefined

    // Log the error server-side. For 5xx errors (our bugs), log the full stack trace.
    // For 4xx errors (client mistakes), just log the message — no need for a stack trace.
    if (statusCode >= 500) {
      this.logger.error(
        `[${traceId}] ${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    } else {
      this.logger.warn(`[${traceId}] ${request.method} ${request.url} → ${statusCode}: ${message}`)
    }

    // Send the normalized error response to the client.
    response.status(statusCode).json({
      statusCode,
      message,
      traceId: traceId || null,
    })
  }
}
