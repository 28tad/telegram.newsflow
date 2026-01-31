# NewsFlow — Контекст проекта

## Что это
Telegram-бот для ведения новостного канала компании.
Собирает новости, обрабатывает через AI, публикует после модерации.

**Принцип: один бот = один проект/канал.**

## Стек
- Node.js 20 + TypeScript
- Telegraf (Telegram bot)
- Fastify (REST API)
- Prisma ORM + PostgreSQL
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

## Структура проекта

```
src/
├── api/
│   ├── index.ts        # Fastify сервер
│   └── routes.ts       # REST API эндпоинты
├── bot/
│   └── index.ts        # Telegram хендлеры
├── db/
│   └── client.ts       # Prisma клиент
├── services/
│   ├── news.ts         # Бизнес-логика новостей
│   └── publisher.ts    # Логика публикации + форматирование
├── config.ts           # Конфигурация из env
└── index.ts            # Точка входа
prisma/
└── schema.prisma       # Схема БД
```

## Модульная архитектура

**Сервисный слой** — вся бизнес-логика в `services/`:
- `news.ts` — CRUD операции с новостями, статистика, модерация
- `publisher.ts` — форматирование и отправка в канал

**Бот** использует сервисы, не содержит бизнес-логику.

**API** использует те же сервисы — готов для Mini App.

## База данных (Prisma)

### Source
```prisma
model Source {
  id, name, type, url, isActive, parseInterval, lastParsedAt
  news News[]
}
```

### News
```prisma
model News {
  id, sourceId, externalId
  title, content, url, imageUrl        // оригинал
  aiTitle, aiContent                   // после AI
  status: raw → processed → pending → approved/rejected
  tgMessageId, moderatedBy, moderatedAt, publishedAt
}
```

### CompanyContext
```prisma
model CompanyContext {
  id, key, value, createdAt, updatedAt
}
```

## REST API

```
GET  /health              # Health check
GET  /api/stats           # Статистика
GET  /api/news/pending    # Новости на модерации
GET  /api/news/:id        # Одна новость
POST /api/news/:id/moderate  # Одобрить/отклонить
POST /api/news            # Создать новость
```

## Env переменные
```
DATABASE_URL=postgresql://...
BOT_TOKEN=...
TG_MODERATION_CHAT_ID=...   # группа модерации
TG_PUBLISH_CHANNEL_ID=...   # канал публикации
API_PORT=3010
OPENAI_API_KEY=...          # для AI обработки
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
- [x] Модульная архитектура
- [x] Prisma ORM
- [x] Сервисный слой
- [x] REST API (готов для Mini App)
- [x] Telegram бот + модерация
- [x] Docker deploy
- [ ] AI обработка + company_context
- [ ] RSS парсеры
- [ ] /blog команда
- [ ] Telegram Mini App

## Следующие этапы
1. **AI обработка** — интеграция OpenAI/Claude, заполнение ai_title/ai_content
2. **RSS парсеры** — автоматический сбор новостей
3. **/blog команда** — ручной ввод постов
4. **Mini App** — веб-интерфейс модерации (использует REST API)
