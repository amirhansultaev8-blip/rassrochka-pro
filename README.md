# Rassrochka Pro — серьёзный учёт рассрочек

Готовый стартовый проект для **Supabase + Vercel**.

## Что уже есть
- вход и регистрация по e-mail и паролю
- база клиентов и договоров
- поручитель
- оплаты
- автоматический расчёт:
  - оплачено
  - остаток
  - активный / скоро платёж / просрочен / закрыт
- поиск и фильтр
- защита данных через **Row Level Security** — каждый пользователь видит только свои данные

## 1) Создай проект в Supabase
В панели Supabase создай новый project, затем открой **SQL Editor** и выполни файл:

`supabase/schema.sql`

Это создаст таблицы, view и политики доступа.

## 2) Включи e-mail/password
В Supabase открой **Authentication → Providers** и включи **Email**.

## 3) Переменные окружения
Скопируй `.env.example` в `.env.local` и подставь свои значения:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Эти значения есть в Supabase: **Project Settings → API**.

## 4) Запуск локально
```bash
npm install
npm run dev
```

## 5) Загрузка на Vercel
Самый простой путь:
1. загрузи этот проект в GitHub
2. в Vercel нажми **Add New → Project**
3. импортируй репозиторий
4. добавь environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. нажми Deploy

Vercel автоматически распознаёт Next.js и использует стандартную сборку для проекта. citeturn908036search1turn908036search10

## 6) Что ещё можно добавить
- роли: админ / менеджер
- печать договора и расписки
- загрузка фото паспорта и договора в Supabase Storage
- SMS / WhatsApp-напоминания
- отчёт за день / неделю / месяц
- отдельная карточка клиента
- редактирование и удаление договоров

## Важные замечания
- RLS в Supabase нужен, чтобы пользователи не видели чужие данные.
- В Vercel переменные окружения надо задавать отдельно для Production / Preview / Development при необходимости. citeturn908036search4turn908036search8
