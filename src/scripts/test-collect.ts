/**
 * Тест сбора новостей: добавляет источник → парсит → сохраняет в БД
 * Запуск: npx tsx src/scripts/test-collect.ts <rss-url> <name>
 */

import { prisma } from '../db/client'
import * as sourcesService from '../services/sources'
import * as collector from '../services/collector'

async function main() {
  const url = process.argv[2]
  const name = process.argv[3] || 'Test Source'

  if (!url) {
    console.log('Использование: npx tsx src/scripts/test-collect.ts <rss-url> [name]')
    console.log('')
    console.log('Пример:')
    console.log('  npx tsx src/scripts/test-collect.ts https://habr.com/ru/rss/best/daily/ "Хабр"')
    process.exit(1)
  }

  try {
    await prisma.$connect()
    console.log('БД подключена\n')

    // Создаём или находим источник
    let source = await prisma.source.findFirst({ where: { url } })

    if (!source) {
      console.log(`Создаю источник: ${name}`)
      source = await sourcesService.create({ name, type: 'rss', url })
      console.log(`Источник создан: ${source.id}\n`)
    } else {
      console.log(`Источник найден: ${source.name} (${source.id})\n`)
    }

    // Собираем новости
    console.log('Собираю новости...\n')
    const result = await collector.collectFromSource(source)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Источник: ${result.sourceName}`)
    console.log(`Всего в фиде: ${result.total}`)
    console.log(`Новых добавлено: ${result.new}`)

    if (result.errors.length > 0) {
      console.log(`Ошибки: ${result.errors.length}`)
      result.errors.forEach((e) => console.log(`  - ${e}`))
    }

    // Показываем pending новости
    const pending = await collector.getUnsentPending(5)
    console.log(`\nВ очереди на модерацию: ${pending.length}`)

    if (pending.length > 0) {
      console.log('\nПоследние:')
      pending.forEach((n) => {
        console.log(`  📰 ${n.title.substring(0, 60)}...`)
      })
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
