import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'NewsFlow/1.0',
  },
})

export interface ParsedItem {
  externalId: string
  title: string
  content: string | null
  url: string | null
  imageUrl: string | null
  pubDate: Date | null
}

export interface ParseResult {
  success: boolean
  items: ParsedItem[]
  error?: string
  feedTitle?: string
}

export async function parseRssFeed(url: string): Promise<ParseResult> {
  try {
    const feed = await parser.parseURL(url)

    const items: ParsedItem[] = feed.items.map((item) => ({
      externalId: item.guid || item.link || item.title || '',
      title: item.title || 'Без заголовка',
      content: item.contentSnippet || item.content || null,
      url: item.link || null,
      imageUrl: extractImageUrl(item),
      pubDate: item.pubDate ? new Date(item.pubDate) : null,
    }))

    return {
      success: true,
      items,
      feedTitle: feed.title,
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    return {
      success: false,
      items: [],
      error,
    }
  }
}

function extractImageUrl(item: Parser.Item): string | null {
  // Try media:content
  const media = (item as any)['media:content']
  if (media?.$.url) {
    return media.$.url
  }

  // Try enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url
  }

  // Try to find image in content
  const content = item.content || item['content:encoded'] || ''
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/)
  if (imgMatch) {
    return imgMatch[1]
  }

  return null
}
