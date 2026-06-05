import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer, LabelList
} from 'recharts'

const PURPLE = '#8B5CF6'
const RED = '#EF4444'
const GRAY = '#E5E7EB'

function findWorstStep(steps) {
  let worstIdx = -1
  let worstRate = 1
  steps.forEach((s, i) => {
    if (s.from_prev !== null && s.from_prev < worstRate) {
      worstRate = s.from_prev
      worstIdx = i
    }
  })
  return worstIdx
}

function FunnelBySteps({ steps, onSelectStep, selectedStep }) {
  const worstIdx = findWorstStep(steps)
  const maxCount = steps[0]?.count || 1

  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const barWidth = (s.count / maxCount) * 100
        const isWorst = i === worstIdx
        const isSelected = selectedStep === s.step
        const barColor = isWorst ? RED : PURPLE

        return (
          <div
            key={s.step}
            className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? 'bg-purple-light ring-1 ring-purple' : ''}`}
            onClick={() => onSelectStep(s.step)}
          >
            {/* Step label */}
            <div className="w-48 shrink-0">
              <div className="flex items-center gap-1.5">
                {isWorst && <span className="text-red-500 text-xs font-bold">▼</span>}
                <span className="text-sm font-medium text-navy">{s.step}. {s.name}</span>
              </div>
              {s.description && (
                <div className="text-xs text-gray-400 mt-0.5 leading-tight">{s.description}</div>
              )}
            </div>

            {/* Bar */}
            <div className="flex-1 relative h-8">
              <div
                className="absolute inset-y-0 left-0 rounded-md flex items-center pl-2"
                style={{ width: `${barWidth}%`, backgroundColor: barColor, minWidth: '4px', opacity: 0.85 }}
              />
              <div className="absolute inset-y-0 left-0 w-full" />
            </div>

            {/* Metrics */}
            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold text-navy">
                {s.count.toLocaleString('ru')}
              </div>
              <div className="text-xs text-gray-400">
                {(s.from_start * 100).toFixed(1)}% от начала
                {s.from_prev !== null && (
                  <span className={isWorst ? 'text-red-500 font-semibold' : ''}>
                    {' · '}{(s.from_prev * 100).toFixed(1)}% от пред.
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-gray-400 mt-2">
        Клик на строку — детальный разбор шага. Красный треугольник — худший переход.
      </p>
    </div>
  )
}

function FunnelByCauses({ causesTotal, onSelectCause, selectedCause }) {
  if (!causesTotal || causesTotal.length === 0) {
    return <p className="text-sm text-gray-400">Данные по причинам отсутствуют</p>
  }

  const steps = ['s1', 's2', 's3', 's4']
  const stepLabels = ['Ш1', 'Ш2', 'Ш3', 'Ш4']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left font-medium text-gray-500 py-2 pr-4">Причина</th>
            {stepLabels.map(l => (
              <th key={l} className="text-center font-medium text-gray-500 py-2 px-2 w-14">{l}</th>
            ))}
            <th className="text-right font-medium text-gray-500 py-2 pl-4">Итого</th>
          </tr>
        </thead>
        <tbody>
          {causesTotal.map(row => {
            const isSelected = selectedCause === row.name
            return (
              <tr
                key={row.name}
                className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-purple-light' : ''}`}
                onClick={() => onSelectCause(row.name)}
              >
                <td className="py-2 pr-4 font-medium text-navy">{row.name}</td>
                {steps.map(s => (
                  <td key={s} className="py-2 px-2 text-center text-gray-600">
                    {row[s] > 0 ? `${(row[s] * 100).toFixed(0)}%` : '—'}
                  </td>
                ))}
                <td className="py-2 pl-4 text-right font-semibold text-navy">
                  {row.total.toLocaleString('ru')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">
        Ш1-Ш4 — доля этой причины среди всех звонков на данном шаге. Клик на строку — детальный разбор.
      </p>
    </div>
  )
}

export default function FunnelBlock({
  funnelSteps, causesTotal, mode, setMode,
  onSelectStep, onSelectCause, selectedStep, selectedCause
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-navy">Воронка</h2>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            className={`tab-btn text-sm ${mode === 'steps' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}
            onClick={() => setMode('steps')}
          >
            По шагам
          </button>
          <button
            className={`tab-btn text-sm ${mode === 'causes' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}
            onClick={() => setMode('causes')}
          >
            По причинам
          </button>
        </div>
      </div>

      {mode === 'steps' && (
        <FunnelBySteps
          steps={funnelSteps}
          onSelectStep={onSelectStep}
          selectedStep={selectedStep}
        />
      )}
      {mode === 'causes' && (
        <FunnelByCauses
          causesTotal={causesTotal}
          onSelectCause={onSelectCause}
          selectedCause={selectedCause}
        />
      )}
    </section>
  )
}
