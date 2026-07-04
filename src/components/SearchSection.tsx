import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TargetCategory } from '../types'
import { useWorkflow } from '../lib/useWorkflow'
import { usePending } from '../lib/pendingContext'
import StatusBadge from './StatusBadge'
import ContactLink from './ContactLink'

interface ScanTarget {
  id: string
  city: string
  country: string
  osm_area: string
  label: string
  active: boolean
}

interface UnauditedProspect {
  id: string
  name: string | null
  category: string | null
  city: string | null
  country: string | null
  phone: string | null
  website: string | null
}

interface SearchSectionProps {
  categories: TargetCategory[]
  scanTargets: ScanTarget[]
}

const PAGE_LIMIT = 200

export default function SearchSection({ categories, scanTargets }: SearchSectionProps) {
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [scanCategory, setScanCategory] = useState('')

  // Filtros de los resultados — independientes de la ciudad elegida para escanear,
  // porque si no, al abrir la pestaña se ve "vacío" con la primera ciudad de la
  // lista aunque haya cientos de prospectos esperando en otra ciudad.
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchText, setSearchText] = useState('')
  const [availableCities, setAvailableCities] = useState<string[]>([])

  const [prospects, setProspects] = useState<UnauditedProspect[]>([])
  const [totalMatching, setTotalMatching] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const scan = useWorkflow('scan')
  const audit = useWorkflow('audit')
  const { addPendingAudit } = usePending()
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (scanTargets.length && !selectedTargetId) setSelectedTargetId(scanTargets[0].id)
  }, [scanTargets, selectedTargetId])

  const target = scanTargets.find((t) => t.id === selectedTargetId)

  const loadAvailableCities = useCallback(async () => {
    const { data, error } = await supabase
      .from('prospect_overview')
      .select('city')
      .eq('audited', false)
      .not('city', 'is', null)
      .limit(1000)

    if (error) {
      console.error(error)
      return
    }
    const unique = Array.from(new Set((data ?? []).map((r) => r.city as string))).sort()
    setAvailableCities(unique)
  }, [])

  const loadProspects = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('prospect_overview')
      .select('id, name, category, city, country, phone, website', { count: 'exact' })
      .eq('audited', false)
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT)

    if (filterCity) query = query.eq('city', filterCity)
    if (filterCategory) query = query.eq('category', filterCategory)

    const { data, error, count } = await query
    if (error) {
      console.error(error)
      setProspects([])
      setTotalMatching(0)
    } else {
      setProspects(data ?? [])
      setTotalMatching(count ?? (data ?? []).length)
    }
    setLoading(false)
  }, [filterCity, filterCategory])

  useEffect(() => {
    loadProspects()
    loadAvailableCities()
  }, [loadProspects, loadAvailableCities])

  // Tiempo real: mientras corre una búsqueda, los negocios que Overpass va
  // encontrando se insertan en Supabase en lotes. Nos suscribimos para que
  // aparezcan solos, sin esperar a que termine todo el escaneo.
  useEffect(() => {
    const channel = supabase
      .channel('search-prospects-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prospects' }, () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current)
        reloadTimer.current = setTimeout(() => {
          loadProspects()
          loadAvailableCities()
        }, 500)
      })
      .subscribe()

    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current)
      supabase.removeChannel(channel)
    }
  }, [loadProspects, loadAvailableCities])

  const visibleProspects = useMemo(() => {
    if (!searchText.trim()) return prospects
    const needle = searchText.trim().toLowerCase()
    return prospects.filter((p) => (p.name ?? '').toLowerCase().includes(needle))
  }, [prospects, searchText])

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
      const allSelected = visibleProspects.length > 0 && visibleProspects.every((p) => prev.has(p.id))
      return allSelected ? new Set() : new Set(visibleProspects.map((p) => p.id))
    })
  }

  function runScan() {
    if (!target) return
    scan.trigger(
      { city: target.city, country: target.country, osm_area: target.osm_area, category: scanCategory },
      () => {
        loadProspects()
        loadAvailableCities()
      },
    )
  }

  function auditSelected() {
    if (selectedIds.size === 0) return
    const items = prospects
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, city: p.city, category: p.category }))

    // Apenas se envían, salen de "Buscar" y aparecen "cargando" en "Auditados" —
    // no hace falta esperar a que termine el workflow completo para verlo.
    addPendingAudit(items)
    setProspects((prev) => prev.filter((p) => !selectedIds.has(p.id)))
    audit.trigger({ prospect_ids: Array.from(selectedIds).join(',') }, () => {
      loadProspects()
      loadAvailableCities()
    })
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-hairline bg-panel p-5">
        <h2 className="mb-1 font-display text-lg text-parchment">1. Buscar prospectos nuevos</h2>
        <p className="mb-4 text-sm text-parchmentDim">
          Elige dónde y qué rubro escanear para traer negocios nuevos desde OpenStreetMap.
        </p>
        {scanTargets.length === 0 ? (
          <p className="font-mono text-xs text-alert">
            No hay ciudades activas configuradas. Ábre "configuración" arriba a la derecha para agregar una.
          </p>
        ) : (
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <select value={selectedTargetId} onChange={(e) => setSelectedTargetId(e.target.value)}>
              {scanTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <select value={scanCategory} onChange={(e) => setScanCategory(e.target.value)}>
              <option value="">Todos los rubros activos</option>
              {categories.map((c) => (
                <option key={c.category_key} value={c.category_key}>
                  {c.label_es}
                </option>
              ))}
            </select>
            <button
              onClick={runScan}
              disabled={scan.state.status === 'running'}
              className="rounded-sm bg-brass px-4 py-2 font-mono text-xs text-ink hover:opacity-90 disabled:opacity-50"
            >
              {scan.state.status === 'running' ? 'Buscando...' : 'Correr búsqueda'}
            </button>
          </div>
        )}
        <StatusBadge status={scan.state.status} lastRunAt={scan.state.lastRunAt} htmlUrl={scan.state.htmlUrl} />
        {scan.state.status === 'running' && (
          <p className="mt-2 flex items-center gap-2 font-mono text-[11px] text-parchmentDim">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brass" />
            Los negocios van a ir apareciendo abajo a medida que se encuentran...
          </p>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
            {visibleProspects.length} sin auditar {filterCity ? `en ${filterCity}` : 'en todas las ciudades'}
            {totalMatching > prospects.length ? ` (mostrando los primeros ${prospects.length} de ${totalMatching})` : ''}
          </h3>
          <div className="flex flex-wrap gap-2">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-48"
            />
            <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="w-44">
              <option value="">Todas las ciudades</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-44">
              <option value="">Todos los rubros</option>
              {categories.map((c) => (
                <option key={c.category_key} value={c.category_key}>
                  {c.label_es}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="font-mono text-xs text-parchmentDim">Cargando...</p>
        ) : visibleProspects.length === 0 ? (
          <p className="font-mono text-xs text-parchmentDim">
            No hay prospectos sin auditar con estos filtros. Corre una búsqueda o quita el filtro de ciudad/rubro/nombre.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hairline font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
                <th className="py-2 pl-2">
                  <input
                    type="checkbox"
                    checked={visibleProspects.length > 0 && visibleProspects.every((p) => selectedIds.has(p.id))}
                    onChange={toggleAll}
                  />
                </th>
                <th className="py-2">Negocio</th>
                <th className="py-2">Ciudad</th>
                <th className="py-2">Rubro</th>
                <th className="py-2 pr-2">Contacto</th>
              </tr>
            </thead>
            <tbody>
              {visibleProspects.map((p) => (
                <tr key={p.id} className="border-b border-hairline/60 hover:bg-panel">
                  <td className="py-2 pl-2">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} />
                  </td>
                  <td className="py-2 text-parchment">{p.name ?? 'Sin nombre'}</td>
                  <td className="py-2 font-mono text-xs text-parchmentDim">{p.city}</td>
                  <td className="py-2 font-mono text-xs text-parchmentDim">{p.category}</td>
                  <td className="py-2 pr-2 font-mono text-xs text-parchmentDim tabular">
                    <ContactLink phone={p.phone} website={p.website} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-sm border border-brass bg-panel px-5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <span className="font-mono text-xs text-brass">{selectedIds.size} seleccionados</span>
          <button
            onClick={auditSelected}
            disabled={audit.state.status === 'running'}
            className="rounded-sm bg-brass px-4 py-1.5 font-mono text-xs text-ink hover:opacity-90 disabled:opacity-50"
          >
            {audit.state.status === 'running' ? 'Auditando...' : 'Auditar seleccionados'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="font-mono text-xs text-parchmentDim hover:text-parchment">
            cancelar
          </button>
        </div>
      )}
    </div>
  )
}
