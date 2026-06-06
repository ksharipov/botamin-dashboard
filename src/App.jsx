import React, { useState, useEffect } from 'react'
import HealthBlock from './components/HealthBlock.jsx'
import FunnelBlock from './components/FunnelBlock.jsx'
import DrillDown from './components/DrillDown.jsx'
import ABTestBlock from './components/ABTestBlock.jsx'
import RecoBlock from './components/RecoBlock.jsx'
import GuideModal from './components/GuideModal.jsx'
import RulesModal from './components/RulesModal.jsx'

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Drill-down state
  const [selectedStep, setSelectedStep] = useState(null)     // 1-4 или null
  const [selectedCause, setSelectedCause] = useState(null)   // строка или null
  const [drillTab, setDrillTab] = useState('causes')

  // Funnel mode
  const [funnelMode, setFunnelMode] = useState('steps')

  // Dialog viewer
  const [selectedCall, setSelectedCall] = useState(null)

  // A/B test detail
  const [selectedTest, setSelectedTest] = useState(null)

  // Guide modal
  const [guideOpen, setGuideOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function openDrillStep(step) {
    setSelectedStep(step)
    setSelectedCause(null)
    setDrillTab('causes')
    setTimeout(() => {
      document.getElementById('drilldown')?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  function openDrillCause(cause) {
    setSelectedCause(cause)
    setSelectedStep(null)
    setDrillTab('causes')
    setTimeout(() => {
      document.getElementById('drilldown')?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  function closeDrill() {
    setSelectedStep(null)
    setSelectedCause(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lavender">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lavender">
        <p className="text-red-500">Ошибка загрузки data.json</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-lavender">
      {/* Header */}
      <header className="bg-navy text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-40 shadow-lg gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-purple rounded-lg flex items-center justify-center font-bold text-sm shrink-0">B</div>
          <div className="min-w-0">
            <div className="font-semibold text-base sm:text-lg leading-tight">Botamin Analytics</div>
            <div className="text-gray-400 text-xs hidden sm:block truncate">
              {data.meta.date_from} — {data.meta.date_to} · {data.meta.total.toLocaleString('ru')} звонков
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => setRulesOpen(true)}
            className="text-xs sm:text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 px-2.5 sm:px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Алгоритм
          </button>
          <button
            onClick={() => setGuideOpen(true)}
            className="text-xs sm:text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 px-2.5 sm:px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Инструкция
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Блок 1 — Health Monitoring */}
        <HealthBlock health={data.health} />

        {/* Блок 2 — Воронка */}
        <FunnelBlock
          funnelSteps={data.funnel_steps}
          causesTotal={data.causes_total}
          mode={funnelMode}
          setMode={setFunnelMode}
          onSelectStep={openDrillStep}
          onSelectCause={openDrillCause}
          selectedStep={selectedStep}
          selectedCause={selectedCause}
        />

        {/* Drill-down */}
        {(selectedStep !== null || selectedCause !== null) && (
          <div id="drilldown">
            <DrillDown
              data={data}
              selectedStep={selectedStep}
              selectedCause={selectedCause}
              activeTab={drillTab}
              setActiveTab={setDrillTab}
              onClose={closeDrill}
              selectedCall={selectedCall}
              setSelectedCall={setSelectedCall}
            />
          </div>
        )}

        {/* Блок 3 — A/B тесты */}
        <ABTestBlock
          abTests={data.ab_tests}
          selectedTest={selectedTest}
          setSelectedTest={setSelectedTest}
        />

        {/* Блок 4 — Рекомендации */}
        <RecoBlock recommendations={data.recommendations} />
      </main>

      {/* Guide Modal */}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  )
}
