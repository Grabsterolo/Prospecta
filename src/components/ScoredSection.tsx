import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { OutreachStatus, ProspectWithScore, TargetCategory } from '../types'
import ProspectTable from './ProspectTable'

interface ScoredSectionProps {
  categories: TargetCategory[]
}

const PAGE_LIMIT = 200

export default function ScoredSection({ categories }: ScoredSectionProps) {
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterOffer, setFilterOffer] = useState('')
  const [searchText, setSearchText] = useState('')
  const [locationRows, setLocationRows] = useState<{ country: string | null; city: string | null }[]>([])
  const [prospects, setProspects] = useState<ProspectWithScore[]>([])
  const [totalMatching, setTotalMatching] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)

  const loadAvailableFilters = useCallback(async () => {
    const { data, error } = await supabase
      .from('prospect_overview')
      .select('country, city')
      .not('score_total', 'is', null)
      .limit(2000)

    if (error) {
      console.error(error)
      return
    }
    setLocationRows(data ?? [])
  }, [])

  const loadProspects = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('prospect_overview')
      .select('*', { count: 'exact' })
      .not('score_total', 'is', null)
      .order('score_total', { ascending: false })
      .limit(PAGE_LIMIT)

    if (filterCountry) query = query.eq('country', filterCountry)
    if (filterCity) query = query.eq('city', filterCity)
    if (filterCategory) query = query.eq('category', filterCategory)
    if (filterOffer) query = query.eq('suggested_offer', filterOffer)

    const { data, error, count } = await query
    if (error) {
      console.error(error)
      setProspects([])
      setTotalMatching(0)
    } else {
      setProspects((data as ProspectWithScore[]) ?? [])
      setTotalMatching(count ?? (data ?? []).length)
    }
    setLoading(false)
  }, [filterCountry, filterCity, filterCategory, filterOffer])

  useEffect(() => {
    loadProspects()
    loadAvailableFilters()
  }, [loadProspects, loadAvailableFilters])

  const visibleProspects = useMemo(() => {
    if (!searchText.trim()) return prospects
    const needle = searchText.trim().toLowerCase()
    return prospects.filter((p) => (p.name ?? '').toLowerCase().includes(needle))
  }, [prospects, searchText])

  const availableCountries = useMemo(
    () => Array.from(new Set(locationRows.map((r) => r.country).filter((c): c is string => Boolean(c)))).sort(),
    [locationRows],
  )
  const availableCities = useMemo(() => {
    const pool = filterCountry ? locationRows.filter((r) => r.country === filterCountry) : locationRows
    return Array.from(new Set(pool.map((r) => r.city).filter((c): c is string => Boolean(c)))).sort()
  }, [locationRows, filterCountry])

  async function handleStatusChange(prospectId: string, status: OutreachStatus) {
    const previous = prospects
    // Actualización optimista: se ve al instante, se revierte si falla el guardado.
    setProspects((prev) => prev.map((p) => (p.id === prospectId ? { ...p, status } : p)))
    setStatusError(null)
    const { error } = await supabase
      .from('outreach')
      .insert({ prospect_id: prospectId, status, updated_at: new Date().toISOString() })
    if (error) {
      console.error(error)
      setProspects(previous)
      setStatusError('No se pudo guardar el cambio de estado. Intenta de nuevo.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-hairline bg-panel p-5">
        <h2 className="mb-1 font-display text-lg text-parchment">3. Prospectos calificados</h2>
        <p className="text-sm text-parchmentDim">
          Ya tienen prioridad y oferta sugerida. Esta es tu lista para contactar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <select
          value={filterCountry}
          onChange={(e) => {
            setFilterCountry(e.target.value)
            setFilterCity('')
          }}
        >
          <option value="">Todos los países</option>
          {availableCountries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
          <option value="">Todas las ciudades</option>
          {availableCities.map((city) => (
            <option key={city} value={city}>
              {city}
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
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Buscar por nombre..."
        />
      </div>

      <p className="font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
        {visibleProspects.length} calificados
        {totalMatching > prospects.length ? ` (mostrando los primeros ${prospects.length} de ${totalMatching})` : ''}
      </p>

      {statusError && (
        <p className="rounded-sm border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">{statusError}</p>
      )}

      {loading ? (
        <p className="font-mono text-xs text-parchmentDim">Cargando...</p>
      ) : (
        <ProspectTable prospects={visibleProspects} onStatusChange={handleStatusChange} />
      )}
    </div>
  )
}
