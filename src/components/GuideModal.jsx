import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'

export default function GuideModal({ onClose }) {
  const [content, setContent] = useState('')

  useEffect(() => {
    fetch('/GUIDE.md')
      .then(r => r.text())
      .then(setContent)
      .catch(() => setContent('Не удалось загрузить инструкцию.'))
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-navy">Инструкция аналитика</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-xl font-bold text-navy mb-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold text-navy mt-6 mb-2 flex items-center gap-2">{children}</h2>,
              p: ({ children }) => <p className="text-sm text-gray-700 mb-2 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ul>,
              li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
              hr: () => <hr className="border-gray-200 my-4" />,
              table: ({ children }) => (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-sm border-collapse border border-gray-200">{children}</table>
                </div>
              ),
              th: ({ children }) => <th className="bg-gray-50 text-left px-3 py-2 border border-gray-200 font-medium text-gray-600 text-xs">{children}</th>,
              td: ({ children }) => <td className="px-3 py-2 border border-gray-200 text-sm text-gray-700">{children}</td>,
              strong: ({ children }) => <strong className="font-semibold text-navy">{children}</strong>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-purple pl-4 my-3 text-gray-600 italic">{children}</blockquote>
              ),
              code: ({ children }) => <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn-primary">Понятно</button>
        </div>
      </div>
    </div>
  )
}
