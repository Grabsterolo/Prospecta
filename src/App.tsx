import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { TargetCategory } from './types'
import TopBar from './components/TopBar'
import Nav, { Section } from './components/Nav'
import SettingsDrawer from './components/SettingsDrawer'
import OverviewPanel from './components/OverviewPanel'
import SearchSection from './components/SearchSection'
import AuditedSection from './components/AuditedSection'
import ScoredSection from './components/ScoredSection'

interface ScanTarget {
  id: string
  city: string
  country: string
  osm_area: string
  label: string
  active: boolean
}

const PIPELINE_SECTIONS: Section[] = ['search', 'audited', 'scored']

export default function App() {
  const [section, setSection] = useState<Section>('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Guardamos la lista completa (activos e inactivos). Antes se filtraba a solo
  // activos antes de guardar el estado, así que un rubro o ciudad pausado
  // desaparecía para siempre de "Configuración" y no había forma de reactivarlo.
  const [allCategories, setAllCategories] = useState<TargetCategory[]>([])
  const [allScanTargets, setAllScanTargets] = useState<ScanTarget[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loadError, setLoadError] = useState(false)

  const loadOptions = useCallback(async () => {
    try {
      const [catRes, targetRes] = await Promise.all([fetch('/api/categories'), fetch('/api/scan-targets')])
      if (!catRes.ok || !targetRes.ok) throw new Error('Respuesta no exitosa del servidor')
      const cats = await catRes.json()
      const targets = await targetRes.json()
      setAllCategories(cats ?? [])
      setAllScanTargets(targets ?? [])
      setLoadError(false)
    } catch (err) {
      console.error('Error cargando rubros/ciudades', err)
      setLoadError(true)
    }
  }, [])

  const loadTotalCount = useCallback(async () => {
    const { count } = await supabase.from('prospects').select('*', { count: 'exact', head: true })
    setTotalCount(count ?? 0)
  }, [])

  useEffect(() => {
    loadOptions()
    loadTotalCount()
  }, [loadOptions, loadTotalCount])

  // Se refresca cada vez que cambias de sección, para no quedar con un número viejo
  useEffect(() => {
    loadTotalCount()
  }, [section, loadTotalCount])

  const activeCategories = useMemo(() => allCategories.filter((c) => c.active), [allCategories])
  const activeScanTargets = useMemo(() => allScanTargets.filter((t) => t.active), [allScanTargets])

  return (
    <div className="min-h-screen pb-24">
      <TopBar totalProspects={totalCount} />
      <Nav active={section} onChange={setSection} onOpenSettings={() => setSettingsOpen(true)} />

      {PIPELINE_SECTIONS.includes(section) && (
        <p className="border-b border-hairline bg-panel/40 px-8 py-2 font-mono text-[11px] text-parchmentDim">
          Cada prospecto avanza solo: <span className="text-parchment">Buscar</span> →{' '}
          <span className="text-parchment">Auditados</span> → <span className="text-parchment">Calificados</span>.
          No necesitas moverlo tú mismo.
        </p>
      )}

      <main className="px-8 py-6">
        {loadError && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-sm border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">
            <span>No se pudieron cargar los rubros y ciudades. Revisa tu conexión a internet.</span>
            <button onClick={loadOptions} className="shrink-0 font-mono text-xs underline hover:text-parchment">
              reintentar
            </button>
          </div>
        )}

        {section === 'overview' && <OverviewPanel categories={allCategories} />}
        {section === 'search' && <SearchSection categories={activeCategories} scanTargets={activeScanTargets} />}
        {section === 'audited' && <AuditedSection categories={activeCategories} />}
        {section === 'scored' && <ScoredSection categories={activeCategories} />}
      </main>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        categories={allCategories}
        scanTargets={allScanTargets}
        onReload={loadOptions}
      />
    </div>
  )
}
