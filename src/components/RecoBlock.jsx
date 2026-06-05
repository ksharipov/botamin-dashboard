import React, { useState } from 'react'

function RecoCard({ reco, index }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-purple/20 rounded-xl overflow-hidden bg-purple-light/30">
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-purple-light/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="w-6 h-6 rounded-full bg-purple text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy">{reco.title}</p>
          {!open && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{reco.evidence}</p>
          )}
        </div>
        <span className="text-gray-400 text-sm shrink-0 mt-0.5">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-purple/10 pt-3">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Факт</span>
            <p className="text-sm text-navy mt-0.5">{reco.evidence}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Гипотеза</span>
            <p className="text-sm text-navy mt-0.5">{reco.hypothesis}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Тест</span>
            <p className="text-sm text-navy mt-0.5">{reco.test}</p>
          </div>
          <div className="bg-white/60 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Ожидаемый эффект</span>
            <p className="text-sm font-medium text-green-700 mt-0.5">{reco.expected}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RecoBlock({ recommendations }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-navy mb-3">Рекомендации</h2>
        <p className="text-sm text-gray-400">
          Автоматических рекомендаций пока нет. Проверьте данные после накопления большего объёма диалогов.
        </p>
      </section>
    )
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-navy">Рекомендации</h2>
        <span className="text-xs bg-purple text-white px-2.5 py-1 rounded-full font-medium">
          {recommendations.length} гипотез
        </span>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Контекст</p>
        <p className="text-sm text-navy leading-relaxed">
          Воронка находится на этапе <strong>Acquisition</strong>. Конверсия в неквалифицированного лида (встреча) — <strong>0.3%</strong>, в квалифицированного — <strong>0.1%</strong>. Целевой показатель: 2–3%, то есть в 10× выше.
        </p>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          При этом звонки совершаются без участия человека — 35 встреч за неделю при нулевых трудозатратах на созвоны не так плохо. Все гипотезы ниже направлены на рост конверсии Acquisition.
        </p>
      </div>
      <div className="space-y-3">
        {recommendations.map((reco, i) => (
          <RecoCard key={i} reco={reco} index={i} />
        ))}
      </div>
    </section>
  )
}
