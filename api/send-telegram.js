export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { who, comment, telegram } = req.body

  if (!who || !comment || !telegram) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return res.status(500).json({ error: 'Bot not configured' })
  }

  const text = `📩 Новое сообщение с Botamin Dashboard\n\nКто: ${who}\nКомментарий: ${comment}\nTelegram: ${telegram}`

  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  })

  if (!tgRes.ok) {
    return res.status(500).json({ error: 'Telegram API error' })
  }

  return res.status(200).json({ ok: true })
}
