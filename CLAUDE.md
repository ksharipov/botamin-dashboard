# Botamin Analytics Dashboard

React + Vite SPA, деплой на Vercel через GitHub (автодеплой при пуше в master).

## Стек
- React 18, Vite 6, Tailwind CSS 3
- Recharts — графики
- react-markdown + remark-gfm — модалки с Markdown

## Структура
```
src/
  App.jsx                  # главный компонент, весь state здесь
  components/
    AboutModal.jsx         # модалка "Контакт" — CTA кнопка в хедере
    GuideModal.jsx         # модалка "Инструкция"
    RulesModal.jsx         # модалка "Алгоритм"
    HealthBlock.jsx
    FunnelBlock.jsx
    DrillDown.jsx
    ABTestBlock.jsx
    RecoBlock.jsx
api/
  send-telegram.js         # Vercel Serverless: отправляет форму в Telegram-бот
  contact.js               # Vercel Serverless: редирект на Telegram (скрывает t.me от парсеров)
```

## Vercel Environment Variables (обязательны)
| Variable | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота от @BotFather |
| `TELEGRAM_CHAT_ID` | числовой ID чата владельца |
| `TELEGRAM_CONTACT_URL` | `https://t.me/YOUR_TG_ID` — скрыт от фронтенда |

## Analytics

### GTM
Контейнер: `GTM-TMZRRCVP`. Подключён в `index.html` (head + body noscript).

### GA4 кастомные события
Все события отправляются через `window.dataLayer.push({ event: '...' })`.

| Событие | Когда срабатывает | Зачем |
|---|---|---|
| `about_modal_open` | клик по кнопке "Контакт" в хедере | первый шаг воронки CTA |
| `contact_me_click` | клик по кнопке "Контакт" внутри модалки | контакт через Telegram |
| `feedback_form_submit` | нажатие Submit в форме | попытка контакта через форму |
| `feedback_form_success` | ответ 200 от `/api/send-telegram` | реальный контакт через форму |
| `feedback_form_error` | ошибка отправки | диагностика |

### Целевая воронка в GA4
`page_view` → `about_modal_open` → `contact_me_click` ИЛИ `feedback_form_success`

## Паттерн модальных окон
```jsx
// App.jsx
const [modalOpen, setModalOpen] = useState(false)
// в хедере:
<button onClick={() => setModalOpen(true)}>...</button>
// внизу JSX:
{modalOpen && <Modal onClose={() => setModalOpen(false)} />}

// Modal.jsx
useEffect(() => {
  const handler = (e) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [onClose])
// оверлей: fixed inset-0 z-50, клик на оверлей = onClose
// контент: stopPropagation
```
