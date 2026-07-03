import { useCallback, useEffect, useState } from 'react'
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

export default function App() {
  const [section, setSection] = useState<Section>('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [categories, setCategories] = useState<TargetCategory[]>([])
  const [scanTargets, setScanTargets] = useState<ScanTarget[]>([])
  const [totalCount, setTotalCount] = useState(0)

  const loadOptions = useCallback(async () => {
    const [catRes, targetRes] = await Promise.all([fetch('/api/categories'), fetch('/api/scan-targets')])
    const cats = await catRes.json()
    const targets = await targetRes.json()
    setCategories((cats ?? []).filter((c: TargetCategory) => c.active))
    setScanTargets((targets ?? []).filter((t: ScanTarget) => t.active))
  }, [])

  useEffect(() => {
    loadOptions()
    supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setTotalCount(count ?? 0))
  }, [loadOptions])

  return (
    <div className="min-h-screen pb-24">
      <TopBar totalProspects={totalCount} />
      <Nav active={section} onChange={setSection} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="px-8 py-6">
        {section === 'overview' && <OverviewPanel />}
        {section === 'search' && <SearchSection categories={categories} scanTargets={scanTargets} />}
        {section === 'audited' && <AuditedSection categories={categories} scanTargets={scanTargets} />}
        {section === 'scored' && <ScoredSection categories={categories} scanTargets={scanTargets} />}
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
