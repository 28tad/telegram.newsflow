# NewsFlow — Контекст проекта

## Что это
Telegram-бот для ведения новостного канала компании.
Собирает новости, обрабатывает через AI, публикует после модерации.

**Принцип: один бот = один проект/канал.**

## Стек
- Node.js 20 + TypeScript
- Telegraf (Telegram bot)
- PostgreSQL
- OpenAI/Claude API (AI обработка)
- Docker

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                      ИСТОЧНИКИ                          │
│                                                         │
│    /blog команда              RSS парсеры               │
│    (ручной ввод)              (автоматически)           │
│         │                          │                    │
│         └──────────┬───────────────┘                    │
│                    ▼                                    │
│    ┌─────────────────────────────┐                      │
│    │     PostgreSQL (raw)        │                      │
│    │     title, content, url     │                      │ 
│    └─────────────┬───────────────┘                      │
│                  ▼                                      │
│    ┌─────────────────────────────┐                      │
│    │      AI обработка           │                      │
│    │  + company_context          │                      │
│    │  → ai_title, ai_content     │                      │
│    └─────────────┬───────────────┘                      │
│                  ▼                                      │
│    ┌─────────────────────────────┐                      │
│    │   Telegram модерация        │                      │
│    │   [✅] [✏️] [❌]             │                      │
│    └─────────────┬───────────────┘                      │ 
│                  ▼                                      │
│    ┌─────────────────────────────┐                      │
│    │   Публикация в канал        │                      │
│    └─────────────────────────────┘                      │ 
└─────────────────────────────────────────────────────────┘
```

## База данных

### sources
Источники новостей
```sql
- id, name, type (rss/manual), url, is_active
```

### news
Новости (оригинал + AI версия)
```sql
- id, source_id
- title, content, url, image_url        -- оригинал
- ai_title, ai_content                   -- после AI
- status: raw → processed → pending → approved/rejected
- tg_message_id, moderated_by, moderated_at
```

### company_context
Контекст для AI
```sql
- id, type (about/products/tone/persona), content
```

## Флоу

### Внешняя новость (парсер)
```
RSS/сайт → raw → AI обработка → processed → модерация → канал
```

### Блог (вручную)
```
/blog текст → raw → AI причёсывает → processed → модерация → канал
```

## Env переменные
```
DATABASE_URL=postgresql://...
BOT_TOKEN=...
TG_MODERATION_CHAT_ID=...   # группа модерации
TG_PUBLISH_CHANNEL_ID=...   # канал публикации
OPENAI_API_KEY=...
```

## Команды бота
- `/start` — приветствие
- `/pending` — новости на модерации
- `/stats` — статистика
- `/blog <текст>` — добавить пост вручную (планируется)

## Деплой
```bash
ssh ortofit@109.73.202.243
cd ~/apps/telegram.newsflow
git pull && docker compose up -d --build
```

## Текущий статус
- [x] Базовая структура
- [x] Telegram бот + модерация
- [x] PostgreSQL
- [x] Docker deploy
- [ ] AI обработка
- [ ] company_context
- [ ] RSS парсеры
- [ ] /blog команда

## Файлы
- `src/bot/index.ts` — бот
- `src/db/client.ts` — БД
- `src/db/migrations/` — миграции
