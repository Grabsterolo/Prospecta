import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ProspectWithScore, TargetCategory } from '../types'
import ProspectTable from './ProspectTable'

interface ScanTarget {
  id: string
  city: string
  country: string
  label: string
}

interface ScoredSectionProps {
  categories: TargetCategory[]
  scanTargets: ScanTarget[]
}

export default function ScoredSection({ categories, scanTargets }: ScoredSectionProps) {
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterOffer, setFilterOffer] = useState('')
  const [prospects, setProspects] = useState<ProspectWithScore[]>([])
  const [loading, setLoading] = useState(true)

  const loadProspects = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('prospect_overview')
      .select('*')
      .not('score_total', 'is', null)
      .order('score_total', { ascending: false })
      .limit(200)

    if (filterCountry) query = query.eq('country', filterCountry)
    if (filterCity) query = query.eq('city', filterCity)
    if (filterCategory) query = query.eq('category', filterCategory)
    if (filterOffer) query = query.eq('suggested_offer', filterOffer)

    const { data, error } = await query
    if (error) {
      console.error(error)
      setProspects([])
    } else {
      setProspects((data as ProspectWithScore[]) ?? [])
    }
    setLoading(false)
  }, [filterCountry, filterCity, filterCategory, filterOffer])

  useEffect(() => {
    loadProspects()
  }, [loadProspects])

  const countries = Array.from(new Set(scanTargets.map((t) => t.country)))
  const cities = scanTargets.filter((t) => !filterCountry || t.country === filterCountry)

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-hairline bg-panel p-5">
        <h2 className="mb-1 font-display text-lg text-parchment">3. Prospectos calificados</h2>
        <p className="text-sm text-parchmentDim">
          Ya tienen prioridad y oferta sugerida. Esta es tu lista para contactar.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
          {cities.map((t) => (
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
        <select value={filterOffer} onChange={(e) => setFilterOffer(e.target.value)}>
          <option value="">Todas las ofertas</option>
          <option value="sitio_web">Sitio web</option>
          <option value="dashboard">Dashboard</option>
          <option value="asistente_ia">Asistente IA</option>
          <option value="automatizacion">Automatización</option>
        </select>
      </div>

      {loading ? (
        <p className="font-mono text-xs text-parchmentDim">Cargando...</p>
      ) : (
        <ProspectTable prospects={prospects} />
      )}
    </div>
  )
}
