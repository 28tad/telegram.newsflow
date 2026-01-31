import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from '../config'
import { registerRoutes } from './routes'

export async function startApi() {
  const app = Fastify({
    logger: config.isDev,
  })

  // Enable CORS for Mini App
  await app.register(cors, {
    origin: true,
  })

  // Register routes
  await registerRoutes(app)

  // Start server
  await app.listen({
    port: config.api.port,
    host: config.api.host,
  })

  console.log(`API server started on port ${config.api.port}`)

  return app
}
