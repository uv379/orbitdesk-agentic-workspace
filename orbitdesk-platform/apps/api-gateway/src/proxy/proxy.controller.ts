/**
 * proxy.controller.ts — Catch-all HTTP route handler that delegates to ProxyService.
 *
 * What is a Controller in NestJS?
 * A Controller handles incoming HTTP requests. It reads the URL, calls the
 * appropriate service method, and sends back a response. Think of it like
 * a traffic cop that receives requests and directs them.
 *
 * @Controller('api') means this controller handles all routes starting with /api/
 *
 * @All('*') means this single method handles ALL HTTP methods (GET, POST, PUT,
 * PATCH, DELETE) and ALL sub-paths under /api/. This is the "catch-all" pattern —
 * perfect for a proxy because we don't care about the specific route here;
 * ProxyService will figure out where to forward it.
 *
 * Why separate Controller and Service?
 * - Controller: only knows about HTTP (reads req, writes res) — stays thin
 * - Service: contains the actual logic (URL building, forwarding, error handling)
 * This separation makes it easy to test the service logic independently of HTTP.
 *
 * @Req() and @Res() are NestJS decorators that inject the raw Express
 * request and response objects into the method parameters.
 * { passthrough: false } on @Res() tells NestJS: "I'll handle the response myself"
 * — otherwise NestJS would try to send the response again and you'd get an error.
 */

import { Controller, All, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { ProxyService } from './proxy.service'

@Controller('api') // Handles everything under /api/
export class ProxyController {
  constructor(
    // NestJS injects ProxyService automatically because both are registered
    // in ProxyModule. This is dependency injection — you ask for it, NestJS provides it.
    private readonly proxyService: ProxyService,
  ) {}

  /**
   * proxyRequest() is the single handler for EVERY /api/* route.
   *
   * @All('*') — matches any HTTP method + any path under /api/
   * @Req()    — injects the full Express Request object
   * @Res()    — injects the Express Response object so we can write to it directly
   */
  @All('*')
  async proxyRequest(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Delegate entirely to ProxyService. The controller does nothing except
    // pass req and res along — all the real logic lives in the service.
    await this.proxyService.forward(req, res)
  }
}
