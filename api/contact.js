export default function handler(req, res) {
  const url = process.env.TELEGRAM_CONTACT_URL
  if (!url) {
    return res.status(500).json({ error: 'TELEGRAM_CONTACT_URL not configured' })
  }
  res.redirect(302, url)
}
