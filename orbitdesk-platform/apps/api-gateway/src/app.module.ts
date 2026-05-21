/**
 * app.module.ts — The root module. Think of it as the "main hub" that wires everything together.
 *
 * In NestJS, a Module is a class decorated with @Module(). It tells NestJS:
 *   - imports:     Which other modules to load (we reuse their services/controllers)
 *   - controllers: Which route handlers exist in THIS module
 *   - providers:   Which services/classes NestJS should create and share via injection
 *
 * AppModule is special — it's the top-level module passed to NestFactory.create().
 * Everything imported here becomes available to the whole application.
 *
 * The configure() method (from NestModule interface) is where we attach middleware.
 * Middleware runs BEFORE route handlers — it's the first thing that processes each request.
 * Order matters: request-id → auth → rate-limit (left to right, top to bottom).
 */

import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'

import configuration from './config/configuration'
import { AuthMiddleware } from './middleware/auth.middleware'
import { RateLimitMiddleware } from './middleware/rate-limit.middleware'
import { RequestIdMiddleware } from './middleware/request-id.middleware'
import { ProxyModule } from './proxy/proxy.module'
import { HealthController } from './health/health.controller'
import { StreamingGateway } from './websocket/gateway'

@Module({
  imports: [
    // ConfigModule loads environment variables from .env and makes them available
    // everywhere via ConfigService. isGlobal:true means you don't have to re-import
    // ConfigModule in every sub-module — it's available app-wide automatically.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration], // Our typed config factory (see config/configuration.ts)
    }),

    // HttpModule registers Axios as a service we can inject to make HTTP calls.
    // isGlobal:true so all modules (especially ProxyModule) can use it without
    // re-importing HttpModule themselves.
    HttpModule.register({ isGlobal: true }),

    // ProxyModule contains the controller that forwards requests to downstream services.
    ProxyModule,
  ],

  // HealthController handles GET /health/live and GET /health/ready.
  // We register it here directly instead of making a separate HealthModule
  // because it's simple enough — just two endpoints, no injected services.
  controllers: [HealthController],

  // StreamingGateway is the WebSocket server for streaming AI responses.
  // It's a "provider" (not a controller) in NestJS terms because WebSocket
  // gateways don't use HTTP routes — they're registered differently.
  providers: [StreamingGateway],
})
export class AppModule implements NestModule {
  /**
   * configure() is called automatically by NestJS during app startup.
   * We use MiddlewareConsumer to decide which middleware runs on which routes.
   *
   * Middleware execution order for every request:
   *   1. RequestIdMiddleware — stamps every request with a unique trace ID
   *   2. AuthMiddleware      — validates the JWT token (skips public routes)
   *   3. RateLimitMiddleware — enforces request limits per user/IP
   */
  configure(consumer: MiddlewareConsumer) {
    // RequestId runs on EVERY request (including health checks).
    // forRoutes('*') means "apply to all routes".
    consumer.apply(RequestIdMiddleware).forRoutes('*')

    // Auth and rate-limit only run on /api/* routes.
    // Health checks (/health/*) are intentionally left unauthenticated
    // so Kubernetes/Docker can probe them without needing a token.
    consumer
      .apply(AuthMiddleware, RateLimitMiddleware)
      .exclude(
        { path: 'health/(.*)', method: RequestMethod.GET }, // skip /health/*
        { path: 'api/auth/login', method: RequestMethod.POST }, // skip login
        { path: 'api/auth/register', method: RequestMethod.POST }, // skip register
      )
      .forRoutes({ path: 'api/*', method: RequestMethod.ALL })
  }
}
