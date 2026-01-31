/**
 * Тестовый скрипт для проверки RSS парсера
 * Запуск: npx tsx src/scripts/test-parser.ts <rss-url>
 */

import { parseRssFeed } from '../services/parser'

async function main() {
  const url = process.argv[2]

  if (!url) {
    console.log('Использование: npx tsx src/scripts/test-parser.ts <rss-url>')
    console.log('')
    console.log('Примеры RSS:')
    console.log('  https://habr.com/ru/rss/best/daily/')
    console.log('  https://lenta.ru/rss/news')
    console.log('  https://www.vedomosti.ru/rss/news')
    process.exit(1)
  }

  console.log(`Парсинг: ${url}\n`)

  const result = await parseRssFeed(url)

  if (!result.success) {
    console.error(`Ошибка: ${result.error}`)
    process.exit(1)
  }

  console.log(`Фид: ${result.feedTitle}`)
  console.log(`Найдено: ${result.items.length} новостей\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  for (const item of result.items.slice(0, 5)) {
    console.log(`📰 ${item.title}`)
    if (item.content) {
      console.log(`   ${item.content.substring(0, 100)}...`)
    }
    if (item.url) {
      console.log(`   🔗 ${item.url}`)
    }
    if (item.imageUrl) {
      console.log(`   🖼  ${item.imageUrl}`)
    }
    console.log('')
  }

  if (result.items.length > 5) {
    console.log(`... и ещё ${result.items.length - 5} новостей`)
  }
}

main()
