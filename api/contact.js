export default function handler(req, res) {
  const url = process.env.TELEGRAM_CONTACT_URL
  res.redirect(302, url)
}
