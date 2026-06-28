import React, { useState, useEffect } from 'react'

function pushEvent(event) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event })
}

export default function AboutModal({ onClose }) {
  const [form, setForm] = useState({ who: '', comment: '', telegram: '' })
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    pushEvent('feedback_form_submit')
    setStatus('loading')

    try {
      const res = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (res.ok) {
        pushEvent('feedback_form_success')
        setStatus('success')
      } else {
        pushEvent('feedback_form_error')
        setStatus('error')
      }
    } catch {
      pushEvent('feedback_form_error')
      setStatus('error')
    }
  }

  function handleContactClick() {
    pushEvent('contact_me_click')
    window.open('/api/contact', '_blank')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-navy">Об авторе</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            Этот дашборд — тестовое задание Product Owner: полный цикл от сырых данных до продуктовой аналитики с A/B-тестами и рекомендациями. Буду рад вашей обратной связи и вопросам о проекте.
          </p>

          <button
            onClick={handleContactClick}
            className="w-full bg-navy text-white py-2.5 rounded-xl font-medium text-sm hover:bg-navy/90 transition-colors"
          >
            Contact Me in Telegram
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">или оставьте сообщение</span>
            </div>
          </div>

          {status === 'success' ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">✓</div>
              <p className="text-sm font-medium text-gray-800">Сообщение отправлено!</p>
              <p className="text-xs text-gray-500 mt-1">Я свяжусь с вами в Telegram.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Кто Вы *</label>
                <input
                  type="text"
                  required
                  value={form.who}
                  onChange={e => setForm(f => ({ ...f, who: e.target.value }))}
                  placeholder="PM в e-commerce, HR в стартапе..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Комментарий *</label>
                <textarea
                  required
                  value={form.comment}
                  onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Ваш отзыв, вопрос или предложение..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ваш Телеграм *</label>
                <input
                  type="text"
                  required
                  value={form.telegram}
                  onChange={e => setForm(f => ({ ...f, telegram: e.target.value }))}
                  placeholder="@username"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple"
                />
              </div>
              {status === 'error' && (
                <p className="text-xs text-red-500">Ошибка отправки. Попробуйте ещё раз.</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-purple text-white py-2.5 rounded-xl font-medium text-sm hover:bg-purple/90 transition-colors disabled:opacity-60"
              >
                {status === 'loading' ? 'Отправка...' : 'Отправить'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
