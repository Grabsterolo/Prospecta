import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { ProspectWithScore, TargetCategory } from './types'
import TopBar from './components/TopBar'
import CategoryFilter from './components/CategoryFilter'
import ProspectTable from './components/ProspectTable'

export default function App() {
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
  }, [])

  useEffect(() => {
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
  }, [activeCategory])

  return (
    <div className="min-h-screen">
      <TopBar totalProspects={prospects.length} lastScanLabel="—" />
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
    </div>
  )
}
