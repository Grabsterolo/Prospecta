import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { ProspectWithScore, TargetCategory } from './types'
import TopBar from './components/TopBar'
import ProspectTable from './components/ProspectTable'
import StepCard, { StepStatus } from './components/StepCard'
import SettingsDrawer from './components/SettingsDrawer'

interface ScanTarget {
  id: string
  city: string
  country: string
  osm_area: string
  label: string
  active: boolean
}

interface WorkflowState {
  status: StepStatus
  lastRunAt: string | null
  htmlUrl: string | null
}

const EMPTY_STATE: WorkflowState = { status: 'never', lastRunAt: null, htmlUrl: null }

async function fetchWorkflowStatus(workflow: string): Promise<WorkflowState> {
  const response = await fetch(`/api/workflow-status?workflow=${workflow}`)
  const data = await response.json()

  if (data.status === 'nunca_corrido' || !data.status) {
    return EMPTY_STATE
  }

  let status: StepStatus = 'idle'
  if (data.status !== 'completed') status = 'running'
  else if (data.conclusion === 'success') status = 'success'
  else status = 'error'

  return { status, lastRunAt: data.updated_at ?? data.created_at, htmlUrl: data.html_url }
}

export default function App() {
  const [categories, setCategories] = useState<TargetCategory[]>([])
  const [scanTargets, setScanTargets] = useState<ScanTarget[]>([])
  const [prospects, setProspects] = useState<ProspectWithScore[]>([])
  const [loadingProspects, setLoadingProspects] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Filtros de la tabla
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAudited, setFilterAudited] = useState<'' | 'pending' | 'audited'>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Formulario del paso 1
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [scanCategory, setScanCategory] = useState('')

  // Formulario del paso 2
  const [batchSize, setBatchSize] = useState('40')

  // Estado de los 3 pasos
  const [scanState, setScanState] = useState<WorkflowState>(EMPTY_STATE)
  const [auditState, setAuditState] = useState<WorkflowState>(EMPTY_STATE)
  const [scoreState, setScoreState] = useState<WorkflowState>(EMPTY_STATE)

  // Estadísticas en vivo
  const [totalCount, setTotalCount] = useState(0)
  const [pendingAuditCount, setPendingAuditCount] = useState(0)
  const [scoredCount, setScoredCount] = useState(0)

  const pollRef = useRef<Record<string, ReturnType<typeof setInterval> | null>>({})

  const loadOptions = useCallback(async () => {
    const [catRes, targetRes] = await Promise.all([fetch('/api/categories'), fetch('/api/scan-targets')])
    setCategories(await catRes.json())
    const targets = await targetRes.json()
    setScanTargets(targets)
    setSelectedTargetId((prev) => prev || (targets[0]?.id ?? ''))
  }, [])

  const loadStats = useCallback(async () => {
    const [{ count: total }, { count: pending }, { count: scored }] = await Promise.all([
      supabase.from('prospects').select('*', { count: 'exact', head: true }),
      supabase.from('pending_audit').select('*', { count: 'exact', head: true }),
      supabase.from('scores').select('*', { count: 'exact', head: true }),
    ])
    setTotalCount(total ?? 0)
    setPendingAuditCount(pending ?? 0)
    setScoredCount(scored ?? 0)
  }, [])

  const loadProspects = useCallback(async () => {
    setLoadingProspects(true)
    let query = supabase
      .from('prospect_overview')
      .select('*')
      .order('score_total', { ascending: false, nullsFirst: false })
      .limit(200)

    if (filterCountry) query = query.eq('country', filterCountry)
    if (filterCity) query = query.eq('city', filterCity)
    if (filterCategory) query = query.eq('category', filterCategory)
    if (filterAudited === 'pending') query = query.eq('audited', false)
    if (filterAudited === 'audited') query = query.eq('audited', true)

    const { data, error } = await query
    if (error) {
      console.error(error)
      setProspects([])
    } else {
      setProspects((data as ProspectWithScore[]) ?? [])
    }
    setLoadingProspects(false)
  }, [filterCountry, filterCity, filterCategory, filterAudited])

  function pollWorkflow(workflow: 'scan' | 'audit' | 'score', setState: (s: WorkflowState) => void) {
    if (pollRef.current[workflow]) return
    pollRef.current[workflow] = setInterval(async () => {
      const state = await fetchWorkflowStatus(workflow)
      setState(state)
      if (state.status !== 'running') {
        clearInterval(pollRef.current[workflow]!)
        pollRef.current[workflow] = null
        loadStats()
        loadProspects()
      }
    }, 4000)
  }

  async function triggerWorkflow(
    workflow: 'scan' | 'audit' | 'score',
    inputs: Record<string, string>,
    setState: (s: WorkflowState) => void,
  ) {
    setState({ status: 'running', lastRunAt: new Date().toISOString(), htmlUrl: null })
    await fetch('/api/run-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow, inputs }),
    })
    // GitHub tarda unos segundos en registrar la corrida antes de que aparezca en la API
    setTimeout(() => pollWorkflow(workflow, setState), 5000)
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const allSelected = prospects.length > 0 && prospects.every((p) => prev.has(p.id))
      if (allSelected) return new Set()
      return new Set(prospects.map((p) => p.id))
    })
  }

  function auditSelected() {
    if (selectedIds.size === 0) return
    triggerWorkflow('audit', { prospect_ids: Array.from(selectedIds).join(',') }, setAuditState)
    setSelectedIds(new Set())
  }

  useEffect(() => {
    loadOptions()
    loadStats()
    fetchWorkflowStatus('scan').then(setScanState)
    fetchWorkflowStatus('audit').then(setAuditState)
    fetchWorkflowStatus('score').then(setScoreState)
  }, [loadOptions, loadStats])

  useEffect(() => {
    loadProspects()
  }, [loadProspects])

  const countries = Array.from(new Set(scanTargets.map((t) => t.country)))
  const citiesForCountry = scanTargets.filter((t) => !filterCountry || t.country === filterCountry)

  return (
    <div className="min-h-screen">
      <TopBar totalProspects={totalCount} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="px-8 py-6">
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StepCard
            stepNumber={1}
            title="Detectar"
            description="Escanea una ciudad y rubro en busca de negocios reales"
            status={scanState.status}
            lastRunAt={scanState.lastRunAt}
            htmlUrl={scanState.htmlUrl}
            statValue={totalCount}
            statLabel="prospectos detectados"
            onRun={() => {
              const target = scanTargets.find((t) => t.id === selectedTargetId)
              if (!target) return
              triggerWorkflow(
                'scan',
                { city: target.city, country: target.country, osm_area: target.osm_area, category: scanCategory },
                setScanState,
              )
            }}
            runDisabled={!selectedTargetId}
          >
            <select value={selectedTargetId} onChange={(e) => setSelectedTargetId(e.target.value)} className="w-full">
              {scanTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <select value={scanCategory} onChange={(e) => setScanCategory(e.target.value)} className="w-full">
              <option value="">Todos los rubros activos</option>
              {categories.map((c) => (
                <option key={c.category_key} value={c.category_key}>
                  {c.label_es}
                </option>
              ))}
            </select>
          </StepCard>

          <StepCard
            stepNumber={2}
            title="Auditar"
            description="Mide la presencia digital de los prospectos pendientes"
            status={auditState.status}
            lastRunAt={auditState.lastRunAt}
            htmlUrl={auditState.htmlUrl}
            statValue={pendingAuditCount}
            statLabel="pendientes de auditar"
            onRun={() => triggerWorkflow('audit', { batch_size: batchSize }, setAuditState)}
          >
            <input
              type="number"
              min={1}
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              className="w-full"
              placeholder="cantidad a auditar"
            />
          </StepCard>

          <StepCard
            stepNumber={3}
            title="Calcular prioridad"
            description="Asigna score y oferta sugerida a cada prospecto auditado"
            status={scoreState.status}
            lastRunAt={scoreState.lastRunAt}
            htmlUrl={scoreState.htmlUrl}
            statValue={scoredCount}
            statLabel="prospectos calificados"
            onRun={() => triggerWorkflow('score', {}, setScoreState)}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
          <span className="font-mono text-[11px] uppercase tracking-wider text-parchmentDim">Filtrar resultados</span>
          <select
            value={filterCountry}
            onChange={(e) => {
              setFilterCountry(e.target.value)
              setFilterCity('')
            }}
          >
            <option value="">Todos los países</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="">Todas las ciudades</option>
            {citiesForCountry.map((t) => (
              <option key={t.id} value={t.city}>
                {t.city}
              </option>
            ))}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Todos los rubros</option>
            {categories.map((c) => (
              <option key={c.category_key} value={c.category_key}>
                {c.label_es}
              </option>
            ))}
          </select>

          <div className="ml-2 flex gap-1">
            {(['', 'pending', 'audited'] as const).map((val) => (
              <button
                key={val || 'todos'}
                onClick={() => setFilterAudited(val)}
                className={`rounded-sm px-2 py-1 font-mono text-[11px] transition-colors ${
                  filterAudited === val ? 'bg-panel2 text-brass' : 'text-parchmentDim hover:text-parchment'
                }`}
              >
                {val === '' ? 'todos' : val === 'pending' ? 'sin auditar' : 'auditados'}
              </button>
            ))}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-sm border border-brass bg-panel px-5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <span className="font-mono text-xs text-brass">
              {selectedIds.size} prospecto{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={auditSelected}
              className="rounded-sm bg-brass px-4 py-1.5 font-mono text-xs text-ink hover:opacity-90"
            >
              Auditar seleccionados
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="font-mono text-xs text-parchmentDim hover:text-parchment"
            >
              cancelar
            </button>
          </div>
        )}

        {loadingProspects ? (
          <p className="font-mono text-xs text-parchmentDim">Cargando resultados...</p>
        ) : (
          <ProspectTable
            prospects={prospects}
            selectedIds={selectedIds}
            onToggleOne={toggleOne}
            onToggleAll={toggleAll}
          />
        )}
      </main>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        categories={categories}
        scanTargets={scanTargets}
        onReload={loadOptions}
      />
    </div>
  )
}
