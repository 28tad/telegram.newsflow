import { prisma } from '../db/client'
import { parseRssFeed } from './parser'
import * as sourcesService from './sources'
import type { Source, News } from '@prisma/client'

export interface CollectResult {
  sourceId: string
  sourceName: string
  total: number
  new: number
  errors: string[]
}

/**
 * Собирает новости из одного источника
 */
export async function collectFromSource(source: Source): Promise<CollectResult> {
  const result: CollectResult = {
    sourceId: source.id,
    sourceName: source.name,
    total: 0,
    new: 0,
    errors: [],
  }

  if (source.type !== 'rss' || !source.url) {
    result.errors.push('Invalid source type or missing URL')
    return result
  }

  const parsed = await parseRssFeed(source.url)

  if (!parsed.success) {
    result.errors.push(parsed.error || 'Parse failed')
    return result
  }

  result.total = parsed.items.length

  for (const item of parsed.items) {
    try {
      // Проверяем дубликат по externalId
      const exists = await prisma.news.findFirst({
        where: {
          sourceId: source.id,
          externalId: item.externalId,
        },
      })

      if (exists) continue

      // Создаём новость со статусом pending (без AI)
      await prisma.news.create({
        data: {
          sourceId: source.id,
          externalId: item.externalId,
          title: item.title,
          content: item.content,
          url: item.url,
          imageUrl: item.imageUrl,
          status: 'pending',
        },
      })

      result.new++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      result.errors.push(`Item "${item.title}": ${msg}`)
    }
  }

  // Обновляем время последнего парсинга
  await sourcesService.updateLastParsed(source.id)

  return result
}

/**
 * Собирает новости из всех активных источников
 */
export async function collectAll(): Promise<CollectResult[]> {
  const sources = await sourcesService.getActive()
  const results: CollectResult[] = []

  for (const source of sources) {
    const result = await collectFromSource(source)
    results.push(result)
  }

  return results
}

/**
 * Получает новые pending новости для отправки на модерацию
 */
export async function getUnsentPending(limit = 10): Promise<News[]> {
  return prisma.news.findMany({
    where: {
      status: 'pending',
      tgMessageId: null, // ещё не отправлены в Telegram
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
}
