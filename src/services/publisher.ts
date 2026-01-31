import type { News } from '@prisma/client'
import type { Telegram } from 'telegraf'

export interface PublishResult {
  success: boolean
  messageId?: number
  error?: string
}

export function formatNewsForChannel(news: News): string {
  const title = news.aiTitle || news.title
  let content = news.aiContent || news.content || ''

  // Лимит caption в Telegram ~1024
  const maxContentLength = 500
  if (content.length > maxContentLength) {
    content = content.substring(0, maxContentLength) + '...'
  }

  let text = `📰 <b>${escapeHtml(title)}</b>`

  if (content) {
    text += `\n\n${escapeHtml(content)}`
  }

  if (news.url) {
    text += `\n\n🔗 <a href="${news.url}">Читать полностью</a>`
  }

  return text
}

export function formatNewsForModeration(news: News): string {
  const title = news.aiTitle || news.title
  let content = news.aiContent || news.content || ''

  // Лимит caption в Telegram ~1024
  const maxContentLength = 500
  if (content.length > maxContentLength) {
    content = content.substring(0, maxContentLength) + '...'
  }

  let text = `📰 <b>${escapeHtml(title)}</b>`

  if (content) {
    text += `\n\n${escapeHtml(content)}`
  }

  if (news.url) {
    text += `\n\n🔗 ${escapeHtml(news.url)}`
  }

  return text
}

export async function publishToChannel(
  telegram: Telegram,
  channelId: string,
  news: News
): Promise<PublishResult> {
  const caption = formatNewsForChannel(news)

  try {
    let messageId: number

    if (news.imageUrl) {
      const result = await telegram.sendPhoto(channelId, news.imageUrl, {
        caption,
        parse_mode: 'HTML',
      })
      messageId = result.message_id
    } else {
      const result = await telegram.sendMessage(channelId, caption, {
        parse_mode: 'HTML',
      })
      messageId = result.message_id
    }

    return { success: true, messageId }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('Publish error:', error)
    return { success: false, error }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
