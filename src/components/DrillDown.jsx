import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Cell
} from 'recharts'

const PURPLE = '#8B5CF6'
const RED = '#EF4444'
const GREEN = '#10B981'
const GRAY = '#9CA3AF'

// ─── Engagement chart ───────────────────────────────────────────────────────

function EngagementChart({ data, selectedStep }) {
  const pctData = useMemo(() => {
    if (!data.engagement_by_step || !selectedStep) return null
    const rows = data.engagement_by_step[String(selectedStep)]
    if (!rows) return null
    const labelNames = { '0': '0 реплик', '1': '1 реплика', '2': '2 реплики', '3+': '3+ реплик' }
    return rows.map(r => ({ name: labelNames[r.label] || r.label, pct: r.pct, count: r.count }))
  }, [data.engagement_by_step, selectedStep])

  if (!pctData) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center h-40">
        <p className="text-sm text-gray-400">Нет данных по активности</p>
      </div>
    )
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-3">Активность клиента</h4>
      <div className="space-y-2">
        {pctData.map(d => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="w-24 text-xs text-gray-500 shrink-0">{d.name}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${d.pct * 100}%`,
                  backgroundColor: d.name === '0 реплик' ? RED : d.name === '3+ реплик' ? GREEN : PURPLE,
                  opacity: 0.75
                }}
              />
            </div>
            <span className="w-12 text-xs text-right font-medium text-navy shrink-0">
              {(d.pct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        0-1 реплика → монолог бота слишком длинный.{' '}
        3+ реплик → клиент участвует, но не убеждён содержанием.
      </p>
    </div>
  )
}

// ─── Causes chart ────────────────────────────────────────────────────────────

function CausesChart({ data, selectedStep, selectedCause }) {
  const causes = useMemo(() => {
    if (!data.causes_by_step || !selectedStep) return null
    const stepData = data.causes_by_step.find(s => s.step === selectedStep)
    return stepData?.causes || null
  }, [data.causes_by_step, selectedStep])

  if (!causes || causes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center h-40">
        <p className="text-sm text-gray-400">Нет данных по причинам отвала</p>
      </div>
    )
  }

  const total = causes.reduce((s, c) => s + c.count, 0)
  const topCauses = [...causes].sort((a, b) => b.count - a.count).slice(0, 7)

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-3">Причины отвала</h4>
      <div className="space-y-2">
        {topCauses.map(c => {
          const pct = total > 0 ? c.count / total : 0
          const isOther = c.name === 'Другое'
          return (
            <div key={c.name} className="flex items-center gap-3">
              <span className="w-36 text-xs text-gray-500 shrink-0 truncate" title={c.name}>
                {c.name}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct * 100}%`,
                    backgroundColor: isOther ? GRAY : PURPLE,
                    opacity: 0.8
                  }}
                />
              </div>
              <span className="w-16 text-xs text-right font-medium text-navy shrink-0">
                {(pct * 100).toFixed(0)}% ({c.count})
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        «Другое» — звонки, где автоклассификация не определила причину. Рекомендуется просмотреть вручную во вкладке «Диалоги».
      </p>
    </div>
  )
}

// ─── By Day tab ──────────────────────────────────────────────────────────────

function ByDayTab({ data, selectedStep }) {
  const chartData = useMemo(() => {
    if (!data.funnel_by_day || !selectedStep) return []
    return data.funnel_by_day.map(day => {
      const stepData = day.steps?.find(s => s.step === selectedStep)
      return {
        date: day.date.slice(5), // "MM-DD"
        from_prev: stepData?.from_prev != null ? +(stepData.from_prev * 100).toFixed(1) : null,
        from_start: stepData?.from_start != null ? +(stepData.from_start * 100).toFixed(1) : null,
        count: stepData?.count || 0,
      }
    }).filter(d => d.from_prev !== null || d.count > 0)
  }, [data.funnel_by_day, selectedStep])

  if (chartData.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">Нет данных по дням</p>
  }

  const values = chartData.map(d => d.from_prev).filter(v => v != null)
  const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 'auto']} />
          <Tooltip
            formatter={(v) => [`${v}%`, 'Конверсия от пред. шага']}
            labelFormatter={l => `Дата: ${l}`}
          />
          <ReferenceLine y={avg} stroke={GRAY} strokeDasharray="4 4" label={{ value: `ср. ${avg.toFixed(1)}%`, fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="from_prev"
            stroke={PURPLE}
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props
              const isLow = payload.from_prev < avg * 0.9
              return <circle key={props.key} cx={cx} cy={cy} r={4} fill={isLow ? RED : PURPLE} stroke="white" strokeWidth={1.5} />
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-1">Красные точки — ниже 90% от среднего. Пунктир — среднее значение.</p>
    </div>
  )
}

// ─── Dialogs tab ─────────────────────────────────────────────────────────────

function DialogRow({ call, onClick }) {
  const lowConf = call.cause_confidence != null && call.cause_confidence < 0.7
  const date = call.date ? call.date.slice(0, 10) : '—'
  const dur = call.duration_sec ? `${Math.floor(call.duration_sec / 60)}:${String(call.duration_sec % 60).padStart(2, '0')}` : '—'

  return (
    <tr
      className="border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => onClick(call)}
    >
      <td className="py-2 pr-2 text-xs text-gray-500 font-mono hidden sm:table-cell">{call.phone || '—'}</td>
      <td className="py-2 pr-2 text-xs text-gray-600 hidden sm:table-cell">{date}</td>
      <td className="py-2 pr-2 text-xs text-gray-600">{dur}</td>
      <td className="py-2 pr-2 text-xs text-navy font-medium">{call.cause || '—'}</td>
      <td className="py-2 text-xs">
        {call.cause_confidence != null ? (
          <span className={lowConf ? 'text-orange-500 font-medium' : 'text-gray-500'}>
            {lowConf && '⚠️ '}{(call.cause_confidence * 100).toFixed(0)}%
          </span>
        ) : '—'}
      </td>
    </tr>
  )
}

function DialogModal({ call, onClose }) {
  if (!call) return null

  const lines = (call.dialog || '').split('\n').filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-navy">{call.phone || 'Номер скрыт'}</p>
            <p className="text-xs text-gray-400">
              {call.date?.slice(0, 10)} · {call.duration_sec ? `${Math.floor(call.duration_sec / 60)}:${String(call.duration_sec % 60).padStart(2, '0')}` : '—'}
              {call.cause && ` · ${call.cause}`}
              {call.cause_confidence != null && ` (${(call.cause_confidence * 100).toFixed(0)}%)`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Transcript */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {lines.map((line, i) => {
            const isBot = line.startsWith('bot:')
            const text = line.replace(/^(bot|user):\s*/, '')
            return (
              <div key={i} className={`flex gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
                <div className={`text-xs font-semibold shrink-0 mt-1 ${isBot ? 'text-purple' : 'text-gray-500'}`}>
                  {isBot ? 'Бот' : 'Клиент'}
                </div>
                <div className={`text-sm px-3 py-2 rounded-xl max-w-[80%] ${isBot ? 'bg-purple-light text-navy' : 'bg-gray-100 text-gray-700'}`}>
                  {text}
                </div>
              </div>
            )
          })}
          {lines.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Транскрипт недоступен</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {call.audio_url && /^https:\/\//.test(call.audio_url) ? (
            <audio controls className="flex-1 h-8" src={call.audio_url}>
              Ваш браузер не поддерживает аудио
            </audio>
          ) : (
            <p className="text-xs text-gray-400">🎧 Аудиозапись недоступна</p>
          )}
          <button onClick={onClose} className="btn-ghost text-sm">Закрыть</button>
        </div>
      </div>
    </div>
  )
}

function DialogsTab({ data, selectedStep, selectedCause, selectedCall, setSelectedCall }) {
  const [causeFilter, setCauseFilter] = useState('all')
  const [sortByConf, setSortByConf] = useState(false)

  const filtered = useMemo(() => {
    if (!data.calls) return []
    let calls = data.calls

    if (selectedStep !== null) {
      calls = calls.filter(c => c.step_reached === selectedStep)
    }
    if (selectedCause !== null) {
      calls = calls.filter(c => c.cause === selectedCause)
    }
    if (causeFilter !== 'all') {
      calls = calls.filter(c => c.cause === causeFilter)
    }

    if (sortByConf) {
      calls = [...calls].sort((a, b) => (a.cause_confidence || 1) - (b.cause_confidence || 1))
    }

    return calls.slice(0, 200)
  }, [data.calls, selectedStep, selectedCause, causeFilter, sortByConf])

  const uniqueCauses = useMemo(() => {
    if (!data.calls) return []
    const base = selectedStep !== null
      ? data.calls.filter(c => c.step_reached === selectedStep)
      : data.calls
    return [...new Set(base.map(c => c.cause).filter(Boolean))].sort()
  }, [data.calls, selectedStep])

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <select
          value={causeFilter}
          onChange={e => setCauseFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">Все причины</option>
          {uniqueCauses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setSortByConf(!sortByConf)}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${sortByConf ? 'border-purple bg-purple-light text-purple' : 'border-gray-200 bg-white text-gray-600'}`}
        >
          ⚠️ Сначала с низкой уверенностью
        </button>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} звонков</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left font-medium text-gray-500 py-2 pr-2 hidden sm:table-cell">Телефон</th>
              <th className="text-left font-medium text-gray-500 py-2 pr-2 hidden sm:table-cell">Дата</th>
              <th className="text-left font-medium text-gray-500 py-2 pr-2">Длит.</th>
              <th className="text-left font-medium text-gray-500 py-2 pr-2">Причина</th>
              <th className="text-left font-medium text-gray-500 py-2">Уверен.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(call => (
              <DialogRow key={call.id} call={call} onClick={setSelectedCall} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Нет звонков</p>
        )}
      </div>

      {/* Dialog modal */}
      {selectedCall && <DialogModal call={selectedCall} onClose={() => setSelectedCall(null)} />}
    </div>
  )
}

// ─── DrillDown main ──────────────────────────────────────────────────────────

export default function DrillDown({
  data, selectedStep, selectedCause,
  activeTab, setActiveTab, onClose,
  selectedCall, setSelectedCall
}) {
  const stepInfo = selectedStep ? data.funnel_steps?.find(s => s.step === selectedStep) : null

  const contextLabel = selectedStep
    ? `Шаг ${selectedStep}: ${stepInfo?.name || ''} — ${stepInfo ? (stepInfo.from_prev != null ? (stepInfo.from_prev * 100).toFixed(1) + '% от предыдущего' : '100% (начало)') : ''}`
    : `Причина: «${selectedCause}»`

  const tabs = [
    { id: 'causes', label: 'Причины' },
    { id: 'byDay', label: 'По дням' },
    { id: 'dialogs', label: 'Диалоги' },
  ]

  return (
    <section className="card p-5 border-l-4 border-purple">
      {/* Context header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-purple shrink-0 mt-1.5" />
            <h3 className="font-semibold text-navy text-sm sm:text-base leading-snug">{contextLabel}</h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-4">Детальный разбор</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 shrink-0"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-100 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : 'tab-btn-inactive'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'causes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EngagementChart data={data} selectedStep={selectedStep} />
          {selectedStep && <CausesChart data={data} selectedStep={selectedStep} selectedCause={selectedCause} />}
        </div>
      )}
      {activeTab === 'byDay' && (
        <ByDayTab data={data} selectedStep={selectedStep} />
      )}
      {activeTab === 'dialogs' && (
        <DialogsTab
          data={data}
          selectedStep={selectedStep}
          selectedCause={selectedCause}
          selectedCall={selectedCall}
          setSelectedCall={setSelectedCall}
        />
      )}
    </section>
  )
}
