import React from 'react'

function pct(v) {
  return v != null ? (v * 100).toFixed(1) + '%' : '—'
}

function delta(today, avg) {
  if (today == null || avg == null || avg === 0) return null
  return ((today - avg) / avg) * 100
}

function MetricCard({ title, todayVal, avgVal, goodDirection, format }) {
  const fmt = format || pct
  const d = delta(todayVal, avgVal)
  const isGood = d == null ? null : (goodDirection === 'up' ? d > 0 : d < 0)

  let arrowColor = 'text-gray-400'
  let arrowIcon = '→'
  if (d !== null) {
    if (isGood) {
      arrowColor = 'text-green-500'
      arrowIcon = d > 0 ? '↑' : '↓'
    } else {
      arrowColor = 'text-red-500'
      arrowIcon = d > 0 ? '↑' : '↓'
    }
  }

  return (
    <div className="card p-3 sm:p-5 flex-1 min-w-0">
      <p className="text-xs sm:text-sm text-gray-500 font-medium mb-1 sm:mb-2 leading-tight">{title}</p>
      <div className="flex items-end gap-1 sm:gap-2 flex-wrap">
        <span className="text-xl sm:text-3xl font-bold text-navy">{fmt(todayVal)}</span>
        {d !== null && (
          <span className={`text-xs font-semibold mb-0.5 ${arrowColor}`}>
            {arrowIcon} {Math.abs(d).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1 hidden sm:block">
        vs {fmt(avgVal)} за всю неделю
      </p>
    </div>
  )
}

export default function HealthBlock({ health }) {
  const { today, week_avg } = health

  return (
    <section>
      <h2 className="text-lg font-semibold text-navy mb-3">Здоровье проекта</h2>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <MetricCard
          title="Квалификация"
          todayVal={today.qualification_rate}
          avgVal={week_avg.qualification_rate}
          goodDirection="up"
        />
        <MetricCard
          title="Технические сбои"
          todayVal={today.tech_failure_rate}
          avgVal={week_avg.tech_failure_rate}
          goodDirection="down"
        />
        <MetricCard
          title="Без диалога"
          todayVal={today.no_dialog_rate}
          avgVal={week_avg.no_dialog_rate}
          goodDirection="down"
        />
      </div>
      <p className="text-xs text-gray-400 mt-2">
        «Сегодня» = последний день данных ({Object.keys(today).length > 0 ? '29.05.2026' : '—'}).
        Сравнение с медианой по всем дням периода.
      </p>
    </section>
  )
}
