import React from 'react'

const STEP_NAMES = ['Ш1', 'Ш2', 'Ш3', 'Ш4']

function pct(v) {
  return v != null ? (v * 100).toFixed(1) + '%' : '—'
}

function DeltaBadge({ a, b }) {
  if (a == null || b == null) return null
  const diff = b - a
  const isPositive = diff > 0
  return (
    <span className={`ml-1 text-xs font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
      {isPositive ? '↑' : '↓'} {Math.abs(diff * 100).toFixed(1)}%
    </span>
  )
}

function TestDetail({ test }) {
  const [va, vb] = test.variants || []
  if (!va || !vb) return null

  const rows = []
  rows.push({
    label: 'Звонков',
    a: va.count?.toLocaleString('ru') || '—',
    b: vb.count?.toLocaleString('ru') || '—',
    rawA: va.count,
    rawB: vb.count,
    isCount: true,
  })

  const maxSteps = Math.max(va.steps?.length || 0, vb.steps?.length || 0)
  for (let i = 0; i < maxSteps; i++) {
    const aVal = va.steps?.[i]
    const bVal = vb.steps?.[i]
    rows.push({
      label: i === 0 ? 'Шаг 1 (согласие)' : `Шаг ${i}→${i + 1}`,
      aVal,
      bVal,
    })
  }

  rows.push({
    label: 'Квалификация итого',
    aVal: va.qualification,
    bVal: vb.qualification,
    highlight: true,
  })

  return (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left font-medium text-gray-500 py-2 pr-6 w-48"></th>
              <th className="text-center font-semibold text-navy py-2 px-4 bg-gray-50 rounded-tl-lg">
                <div>Вариант А</div>
                <div className="text-xs font-normal text-gray-500 truncate max-w-32">{va.label}</div>
              </th>
              <th className="text-center font-semibold text-navy py-2 px-4 bg-purple-light rounded-tr-lg">
                <div>Вариант Б</div>
                <div className="text-xs font-normal text-purple truncate max-w-32">{vb.label}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-50 ${row.highlight ? 'bg-gray-50 font-semibold' : ''}`}
              >
                <td className="py-2.5 pr-6 text-gray-600 text-sm">{row.label}</td>
                <td className="py-2.5 px-4 text-center">
                  {row.isCount ? row.a : pct(row.aVal)}
                </td>
                <td className="py-2.5 px-4 text-center">
                  {row.isCount
                    ? row.b
                    : (
                      <span>
                        {pct(row.bVal)}
                        {!row.isCount && <DeltaBadge a={row.aVal} b={row.bVal} />}
                      </span>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats footer */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg flex flex-wrap items-center gap-4 text-sm">
        <div>
          <span className="text-gray-500">p-value: </span>
          <span className={`font-semibold ${test.p_value < 0.05 ? 'text-green-600' : 'text-orange-500'}`}>
            {test.p_value < 0.001 ? '< 0.001' : test.p_value?.toFixed(3) || '—'}
          </span>
        </div>
        {test.ci_low != null && test.ci_high != null && (
          <div>
            <span className="text-gray-500">95% CI: </span>
            <span className="font-semibold text-navy">
              {(test.ci_low * 100).toFixed(1)}% — {(test.ci_high * 100).toFixed(1)}%
            </span>
          </div>
        )}
        <div className={`font-medium ${test.p_value < 0.05 ? 'text-green-600' : 'text-orange-500'}`}>
          {test.p_value < 0.05
            ? `✓ Разница статистически значима (${(( 1 - test.p_value) * 100).toFixed(0)}% уверенность)`
            : '⏳ Недостаточно данных для уверенного вывода'}
        </div>
      </div>
    </div>
  )
}

export default function ABTestBlock({ abTests, selectedTest, setSelectedTest }) {
  if (!abTests || abTests.length === 0) {
    return (
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-navy mb-3">A/Б-тесты</h2>
        <p className="text-sm text-gray-400">Тесты не обнаружены</p>
      </section>
    )
  }

  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold text-navy mb-4">A/Б-тесты</h2>

      <div className="space-y-4">
        {abTests.map((test, i) => {
          const isOpen = selectedTest === i
          const va = test.variants?.[0]
          const vb = test.variants?.[1]
          const winner = va && vb && vb.qualification > va.qualification ? 'Б' : 'А'
          const diff = va && vb ? Math.abs((vb.qualification - va.qualification) * 100).toFixed(1) : null

          return (
            <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Test header row */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setSelectedTest(isOpen ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-navy">{test.name}</span>
                  {test.p_value < 0.05 ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      ✓ Значимо
                    </span>
                  ) : (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                      ⏳ Мало данных
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {diff && (
                    <span className="text-sm text-gray-500">
                      Вариант {winner} {vb && vb.qualification > (va?.qualification || 0) ? '+' : '-'}{diff}%
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-4">
                  <TestDetail test={test} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
