# WB Tariffs Service

Сервис для автоматического получения тарифов Wildberries и экспорта в Google Sheets.

## Возможности

- ✅ Ежечасное получение тарифов коробов с WB API
- ✅ Сохранение в PostgreSQL с обновлением существующих записей
- ✅ Экспорт в произвольное количество Google таблиц
- ✅ Сортировка по коэффициенту доставки
- ✅ Retry logic при сбоях
- ✅ Health check и метрики (HTTP endpoints)
- ✅ Graceful shutdown
- ✅ Docker контейнеризация

## Технологии

- Node.js 20 + TypeScript
- PostgreSQL 16 + Knex.js
- Google Sheets API
- Docker & Docker Compose
- Jest (тестирование)

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone <repository-url>
cd btlz-wb-test
```

### 2. Настроить переменные окружения

```bash
cp example.env .env
```

Откройте `.env` и заполните:

```env
# Database
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

APP_PORT=5000

WB_API_TOKEN=your_token_here

GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_IDS=spreadsheet_id_1,spreadsheet_id_2
```

### 3. Настроить Google Sheets

#### Создать Service Account

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте проект
3. Включите Google Sheets API (APIs & Services → Library)
4. Создайте сервис-аккаунт (IAM & Admin → Service Accounts)
5. Создайте JSON ключ (Keys → Add Key → Create new key → JSON)
6. Скопируйте `client_email` и `private_key` в `.env`

#### Настроить таблицу

1. Создайте таблицу в [Google Sheets](https://sheets.google.com/)
2. Переименуйте первый лист в `stocks_coefs`
3. Поделитесь таблицей с email сервис-аккаунта (роль Editor)
4. Скопируйте ID из URL в `.env`

### 4. Запустить

```bash
docker compose up --build
```

После запуска:
- Выполнятся миграции БД
- Запустится начальная синхронизация
- Запустится планировщик (каждый час)
- Запустится HTTP сервер на порту 5000

## Проверка работы

### 1. Проверка запуска приложения

```bash
# Проверить что контейнеры запустились
docker compose ps

# Должны быть running и healthy:
# - postgres
# - app
```

### 2. Проверка логов

```bash
# Логи приложения
docker compose logs -f app

# Должны увидеть:
# - "All migrations and seeds have been run"
# - "Starting tariff sync for date: YYYY-MM-DD"
# - "Tariff sync completed successfully"
# - "Hourly tariff sync scheduled"
```

### 3. Проверка данных в БД

```bash
docker exec -it postgres psql -U postgres -d postgres

# Проверить что миграции прошли
\dt

# Должны быть таблицы:
# - box_tariffs
# - spreadsheets
# - migrations

# Проверить количество записей
SELECT COUNT(*) FROM box_tariffs;

# Посмотреть тарифы (отсортированы по коэффициенту)
SELECT warehouse_name, box_delivery_coef, date
FROM box_tariffs
ORDER BY box_delivery_coef ASC
LIMIT 10;

# Проверить что данные за сегодня
SELECT COUNT(*), date
FROM box_tariffs
GROUP BY date
ORDER BY date DESC;
```

### 4. Проверка Google Sheets

1. Откройте вашу Google таблицу
2. Перейдите на лист `stocks_coefs`
3. Проверьте что:
   - ✅ Есть заголовки (Склад, Регион, Коэф. доставки, и т.д.)
   - ✅ Данные появились (обычно в течение 1-2 минут после запуска)
   - ✅ Тарифы отсортированы по коэффициенту доставки (по возрастанию)
   - ✅ Данные обновляются каждый час

### 5. Проверка планировщика

```bash
# Подождите до следующего часа (например, до 15:00, 16:00)
# Проверьте логи - должна быть новая синхронизация
docker compose logs app | grep "Starting tariff sync"

# Должно быть несколько записей с разным временем
```

### 6. Проверка обновления данных

```bash
# Данные за один день должны обновляться, а не дублироваться
docker exec -it postgres psql -U postgres -d postgres -c \
  "SELECT date, COUNT(*) FROM box_tariffs GROUP BY date;"

# Для каждой даты должна быть одна группа записей
# (не должно быть дубликатов для одного склада в один день)
```

### 7. Проверка health check и метрик

```bash
# Health check
curl http://localhost:5000/health

# Должен вернуть:
# {"status":"healthy","timestamp":"2025-01-20T..."}

# Метрики синхронизации
curl http://localhost:5000/metrics

# Должен вернуть JSON с:
# - successRate: процент успешных синхронизаций
# - averageDuration: средняя длительность в мс
# - recentSyncs: последние 10 синхронизаций с деталями
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `POSTGRES_*` | Настройки PostgreSQL |
| `APP_PORT` | Порт приложения |
| `WB_API_TOKEN` | Токен WB API |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email сервис-аккаунта |
| `GOOGLE_PRIVATE_KEY` | Приватный ключ |
| `GOOGLE_SPREADSHEET_IDS` | ID таблиц (через запятую) |

## Команды

```bash
# Запуск
docker compose up --build

# Фоновый режим
docker compose up -d

# Остановка
docker compose down

# Полная очистка
docker compose down -v --rmi local
```

## Разработка

### Локальный запуск

```bash
npm install
docker compose up postgres -d
npm run knex:dev migrate:latest
npm run knex:dev seed:run
npm run dev
```

### Тестирование

```bash
# Запуск тестов
npm test

# С покрытием
npm run test:coverage

# Watch mode
npm run test:watch
```

### Полезные команды

```bash
# Type checking
npm run tsc:check

# Линтинг
npm run eslint-fix

# Форматирование
npm run prettier-format

# Сборка
npm run build
```

## Структура проекта

```
src/
├── app.ts                     # Точка входа
├── constants/
│   └── config.ts              # Конфигурация
├── services/
│   ├── wbApi.ts               # WB API
│   ├── googleSheets.ts        # Google Sheets
│   ├── tariffSync.ts          # Синхронизация
│   └── scheduler.ts           # Планировщик
├── repositories/
│   └── tariffRepository.ts    # Работа с БД
├── utils/
│   ├── logger.ts              # Логирование
│   └── errors.ts              # Ошибки
└── postgres/
    ├── migrations/            # Миграции
    └── seeds/                 # Seeds
```

## Архитектура

### Паттерны

- **Repository Pattern** - работа с БД
- **Singleton Pattern** - единственный экземпляр сервисов
- **Facade Pattern** - упрощение сложной логики

### Основные компоненты

- **WBApiService** - получение данных с WB API (retry logic, timeout)
- **TariffRepository** - работа с БД (transactions, batch operations)
- **GoogleSheetsService** - экспорт в Google Sheets (parallel updates)
- **TariffSyncService** - оркестрация синхронизации
- **SchedulerService** - планировщик задач

## Troubleshooting

### Приложение не запускается

```bash
docker compose logs app
docker compose logs postgres
docker compose down -v --rmi local
docker compose up --build
```

### Ошибка подключения к БД

```bash
docker compose ps
docker exec -it postgres psql -U postgres -d postgres
```

### Google Sheets не обновляются

1. Проверьте доступ сервис-аккаунта к таблице (роль Editor)
2. Проверьте корректность `GOOGLE_PRIVATE_KEY` (должен содержать `\n`)
3. Убедитесь что лист называется `stocks_coefs`
