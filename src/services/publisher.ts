import type { News } from '@prisma/client'
import type { Telegram } from 'telegraf'

export interface PublishResult {
  success: boolean
  messageId?: number
  error?: string
}

export function formatNewsForChannel(news: News): string {
  const title = news.aiTitle || news.title
  const content = news.aiContent || news.content || ''

  let text = `📰 *${escapeMarkdown(title)}*`

  if (content) {
    text += `\n\n${escapeMarkdown(content)}`
  }

  if (news.url) {
    text += `\n\n🔗 [Читать полностью](${news.url})`
  }

  return text
}

export function formatNewsForModeration(news: News): string {
  const title = news.aiTitle || news.title
  const content = news.aiContent || news.content || ''

  let text = `📰 *${escapeMarkdown(title)}*`

  if (content) {
    text += `\n\n${escapeMarkdown(content)}`
  }

  if (news.url) {
    text += `\n\n🔗 ${news.url}`
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
        parse_mode: 'Markdown',
      })
      messageId = result.message_id
    } else {
      const result = await telegram.sendMessage(channelId, caption, {
        parse_mode: 'Markdown',
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

function escapeMarkdown(text: string): string {
  return text
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/`/g, '\\`')
}
