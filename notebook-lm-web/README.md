# CortexNote - NotebookLM Clone

Веб-приложение в стиле Google NotebookLM, построенное на Next.js с использованием Google Gemini AI для генерации контента.

## 🚀 Возможности

- 📄 Загрузка и анализ PDF документов
- 🖼️ Распознавание текста с изображений
- 📝 Автоматическая суммаризация контента
- 🎙️ Генерация подкаст-стиля аудио обзоров
- 📊 Создание презентаций
- ➗ Поддержка LaTeX/математических формул

## 🛠️ Технологии

- **Framework:** Next.js 16
- **AI:** Google Gemini API
- **Styling:** Tailwind CSS
- **UI:** React 19, Framer Motion, Lucide Icons
- **Markdown:** react-markdown с поддержкой KaTeX

---

## 📋 Требования

- **Node.js** 18.0 или выше
- **npm** или **yarn** / **pnpm** / **bun**
- **Google API ключ** (для Gemini AI)

---

## ⚙️ Установка и запуск

### 1. Клонирование репозитория

```bash
git clone https://github.com/YOUR_USERNAME/CBER_cvs.git
cd CBER_cvs/notebook-lm-web
```

### 2. Установка зависимостей

```bash
npm install
# или
yarn install
# или
pnpm install
```

### 3. Настройка переменных окружения

Создайте файл `.env.local` в корне папки `notebook-lm-web`:

```bash
cp .env.example .env.local
```

Или создайте файл вручную и добавьте:

```env
GOOGLE_API_KEY=ваш_google_api_ключ
```

> **💡 Как получить Google API ключ:**
> 1. Перейдите на [Google AI Studio](https://aistudio.google.com/apikey)
> 2. Создайте новый API ключ
> 3. Скопируйте ключ в файл `.env.local`

### 4. Запуск сервера разработки

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

---

## 📦 Другие команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск сервера разработки |
| `npm run build` | Сборка production версии |
| `npm run start` | Запуск production сервера |
| `npm run lint` | Проверка кода линтером |

---

## 📁 Структура проекта

```
notebook-lm-web/
├── src/
│   ├── app/          # Next.js App Router (страницы и API)
│   ├── components/   # React компоненты
│   ├── lib/          # Утилиты и хелперы
│   └── types/        # TypeScript типы
├── public/           # Статические файлы
├── .env.local        # Переменные окружения (не в git)
└── package.json
```

---

## 🔧 Решение проблем

### Ошибка "API key not found"

Убедитесь, что файл `.env.local` существует и содержит корректный `GOOGLE_API_KEY`.

### Ошибка при установке зависимостей

```bash
# Очистите кэш и переустановите
rm -rf node_modules package-lock.json
npm install
```

### Порт 3000 занят

```bash
# Запуск на другом порту
npm run dev -- -p 3001
```

---

## 📄 Лицензия

MIT License
