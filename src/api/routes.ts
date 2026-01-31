import { FastifyInstance } from 'fastify'
import * as newsService from '../services/news'

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get('/health', async () => {
    return { status: 'ok' }
  })

  // Get stats
  app.get('/api/stats', async () => {
    const stats = await newsService.getStats()
    return stats
  })

  // Get pending news
  app.get('/api/news/pending', async (request) => {
    const { limit = 10 } = request.query as { limit?: number }
    const news = await newsService.getPending(limit)
    return news
  })

  // Get news by ID
  app.get('/api/news/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const news = await newsService.getById(id)

    if (!news) {
      return reply.status(404).send({ error: 'News not found' })
    }

    return news
  })

  // Moderate news (approve/reject)
  app.post('/api/news/:id/moderate', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status, moderator } = request.body as {
      status: 'approved' | 'rejected'
      moderator: string
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return reply.status(400).send({ error: 'Invalid status' })
    }

    const news = await newsService.moderate(id, status, moderator || 'api')

    if (!news) {
      return reply.status(404).send({ error: 'News not found' })
    }

    return news
  })

  // Create news (for manual input)
  app.post('/api/news', async (request) => {
    const data = request.body as {
      title: string
      content?: string
      url?: string
      imageUrl?: string
    }

    const news = await newsService.create({
      ...data,
      status: 'pending',
    })

    return news
  })
}
