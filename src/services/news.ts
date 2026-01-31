import { prisma } from '../db/client'
import type { News } from '@prisma/client'

export type { News }

export interface NewsStats {
  pending: number
  approved: number
  rejected: number
  raw: number
  processed: number
}

export async function getStats(): Promise<NewsStats> {
  const counts = await prisma.news.groupBy({
    by: ['status'],
    _count: true,
  })

  const stats: NewsStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    raw: 0,
    processed: 0,
  }

  for (const row of counts) {
    if (row.status in stats) {
      stats[row.status as keyof NewsStats] = row._count
    }
  }

  return stats
}

export async function getPending(limit = 10): Promise<News[]> {
  return prisma.news.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getById(id: string): Promise<News | null> {
  return prisma.news.findUnique({ where: { id } })
}

export async function updateTelegramMessageId(newsId: string, messageId: bigint): Promise<void> {
  await prisma.news.update({
    where: { id: newsId },
    data: { tgMessageId: messageId },
  })
}

export async function moderate(
  newsId: string,
  status: 'approved' | 'rejected',
  moderator: string
): Promise<News | null> {
  return prisma.news.update({
    where: { id: newsId },
    data: {
      status,
      moderatedBy: moderator,
      moderatedAt: new Date(),
      publishedAt: status === 'approved' ? new Date() : null,
    },
  })
}

export async function create(data: {
  title: string
  content?: string
  url?: string
  imageUrl?: string
  sourceId?: string
  externalId?: string
  status?: string
}): Promise<News> {
  return prisma.news.create({
    data: {
      title: data.title,
      content: data.content,
      url: data.url,
      imageUrl: data.imageUrl,
      sourceId: data.sourceId,
      externalId: data.externalId,
      status: data.status || 'pending',
    },
  })
}
