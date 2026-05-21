/**
 * main.ts — The entry point of the entire API Gateway.
 *
 * NestJS always starts here. Think of it like the "power button" of the server.
 * This file does 4 things:
 *   1. Creates the NestJS application using AppModule as the root
 *   2. Enables CORS so the browser frontend can talk to this server
 *   3. Registers a global error filter (catches ALL uncaught errors in one place)
 *   4. Starts listening for HTTP requests on port 8000
 *
 * Port 8000 is important — your frontend SDK (packages/sdk/src/client.ts)
 * already points to http://localhost:8000 as the API base URL.
 */

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './filters/http-exception.filter'

async function bootstrap() {
  // NestFactory.create() reads AppModule and builds the entire dependency tree.
  // AppModule tells NestJS which controllers, services, and middleware exist.
  const app = await NestFactory.create(AppModule)

  // CORS = Cross-Origin Resource Sharing.
  // Browsers block requests between different origins (ports count as different origins).
  // Our frontend runs on port 5173 (Vite dev), the gateway on 8000 — without CORS
  // the browser would reject every API call.
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*', // In production, replace * with your domain
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id'],
    credentials: true,
  })

  // Register our custom global error filter.
  // "Global" means it applies to EVERY route in the entire app — no need to
  // add it to individual controllers. If anything throws an error anywhere,
  // this filter catches it and sends a consistent JSON response.
  app.useGlobalFilters(new HttpExceptionFilter())

  // Start the HTTP server. '0.0.0.0' means "listen on all network interfaces",
  // which is required inside Docker containers (not just localhost).
  const port = process.env.PORT || 8000
  await app.listen(port, '0.0.0.0')

  console.log(`🚀 API Gateway running on http://localhost:${port}`)
}

// Call bootstrap() to actually start the server.
// The void keyword just tells TypeScript we don't care about the returned Promise.
void bootstrap()
