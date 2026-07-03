import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { ProspectWithScore, TargetCategory } from './types'
import TopBar from './components/TopBar'
import CategoryFilter from './components/CategoryFilter'
import ProspectTable from './components/ProspectTable'
import ControlPanel from './components/ControlPanel'

type View = 'prospects' | 'control'

export default function App() {
  const [view, setView] = useState<View>('prospects')
  const [categories, setCategories] = useState<TargetCategory[]>([])
  const [prospects, setProspects] = useState<ProspectWithScore[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from('target_categories')
        .select('*')
        .order('priority', { ascending: false })

      if (error) {
        console.error('Error cargando categorías', error)
        return
      }
      setCategories(data ?? [])
    }
    loadCategories()
  }, [view])

  useEffect(() => {
    if (view !== 'prospects') return

    async function loadProspects() {
      setLoading(true)
      let query = supabase
        .from('prospect_overview')
        .select('*')
        .order('score_total', { ascending: false, nullsFirst: false })

      if (activeCategory) {
        query = query.eq('category', activeCategory)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error cargando prospectos', error)
        setProspects([])
      } else {
        setProspects((data as ProspectWithScore[]) ?? [])
      }
      setLoading(false)
    }
    loadProspects()
  }, [activeCategory, view])

  return (
    <div className="min-h-screen">
      <TopBar totalProspects={prospects.length} lastScanLabel="—" />
      <nav className="flex gap-1 border-b border-hairline px-8 py-3">
        <TabButton active={view === 'prospects'} onClick={() => setView('prospects')}>
          Prospectos
        </TabButton>
        <TabButton active={view === 'control'} onClick={() => setView('control')}>
          Panel de control
        </TabButton>
      </nav>

      {view === 'prospects' ? (
        <div className="flex">
          <CategoryFilter
            categories={categories}
            activeKey={activeCategory}
            onSelect={setActiveCategory}
          />
          <main className="flex-1 px-8 py-6">
            {loading ? (
              <p className="font-mono text-xs text-parchmentDim">Escaneando…</p>
            ) : (
              <ProspectTable prospects={prospects} />
            )}
          </main>
        </div>
      ) : (
        <main className="px-8 py-6">
          <ControlPanel />
        </main>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm px-3 py-1.5 font-mono text-xs transition-colors ${
        active ? 'bg-panel2 text-brass' : 'text-parchmentDim hover:text-parchment'
      }`}
    >
      {children}
    </button>
  )
}
