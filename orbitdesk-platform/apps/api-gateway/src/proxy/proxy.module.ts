/**
 * proxy.module.ts — Bundles the proxy controller and service into one NestJS module.
 *
 * What is a Module in NestJS?
 * A module is a boundary that groups related code (controller + service + etc.)
 * and controls what is visible to the rest of the app.
 *
 *   imports:     Other modules whose exported providers we need.
 *                Here we import HttpModule so ProxyService can inject HttpService.
 *   controllers: Route handlers in this module. NestJS registers their routes.
 *   providers:   Services/classes NestJS creates and manages (via dependency injection).
 *                ProxyService is a provider — NestJS creates one instance and injects
 *                it into ProxyController automatically.
 *
 * ProxyModule is imported in AppModule (app.module.ts). That's how NestJS discovers
 * it and wires everything together at startup.
 */

import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ProxyController } from './proxy.controller'
import { ProxyService } from './proxy.service'

@Module({
  imports: [
    // HttpModule registers HttpService (an injectable Axios wrapper).
    // ProxyService injects HttpService to make downstream HTTP calls.
    // timeout: default timeout for all Axios requests from this module (30s)
    HttpModule.register({ timeout: 30_000 }),
  ],
  controllers: [ProxyController], // Register the catch-all /api/* route handler
  providers: [ProxyService],      // Register the forwarding logic as an injectable service
})
export class ProxyModule {}
