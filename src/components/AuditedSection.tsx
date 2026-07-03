import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TargetCategory } from '../types'
import { useWorkflow } from '../lib/useWorkflow'
import StatusBadge from './StatusBadge'
import { timeAgo } from '../lib/time'

interface AuditedProspect {
  id: string
  name: string | null
  city: string | null
  category: string | null
  audit_date: string | null
  audit_has_website: boolean | null
  pagespeed_score: number | null
  has_ssl: boolean | null
}

interface AuditedSectionProps {
  categories: TargetCategory[]
}

const PAGE_LIMIT = 200

export default function AuditedSection({ categories }: AuditedSectionProps) {
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchText, setSearchText] = useState('')
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [prospects, setProspects] = useState<AuditedProspect[]>([])
  const [totalMatching, setTotalMatching] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const score = useWorkflow('score')

  const loadAvailableCities = useCallback(async () => {
    const { data, error } = await supabase
      .from('prospect_overview')
      .select('city')
      .eq('audited', true)
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
      .select('id, name, city, category, audit_date, audit_has_website, pagespeed_score, has_ssl', { count: 'exact' })
      .eq('audited', true)
      .is('score_total', null)
      .order('audit_date', { ascending: false })
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

  const visibleProspects = useMemo(() => {
    if (!searchText.trim()) return prospects
    const needle = searchText.trim().toLowerCase()
    return prospects.filter((p) => (p.name ?? '').toLowerCase().includes(needle))
  }, [prospects, searchText])

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const allSelected = visibleProspects.length > 0 && visibleProspects.every((p) => prev.has(p.id))
      return allSelected ? new Set() : new Set(visibleProspects.map((p) => p.id))
    })
  }

  function scoreSelected() {
    if (selectedIds.size === 0) return
    score.trigger({ prospect_ids: Array.from(selectedIds).join(',') }, () => {
      loadProspects()
      loadAvailableCities()
    })
    setSelectedIds(new Set())
  }

  function scoreAll() {
    score.trigger({}, () => {
      loadProspects()
      loadAvailableCities()
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-hairline bg-panel p-5">
        <h2 className="mb-1 font-display text-lg text-parchment">2. Prospectos auditados</h2>
        <p className="mb-4 text-sm text-parchmentDim">
          Ya se midió su presencia digital. Elige a cuáles calcularles prioridad y oferta sugerida.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-3">
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
          <button
            onClick={scoreAll}
            disabled={score.state.status === 'running'}
            className="rounded-sm bg-panel2 px-3 py-1.5 font-mono text-xs text-parchmentDim hover:text-brass disabled:opacity-50"
          >
            calificar todos los auditados
          </button>
        </div>
        <StatusBadge status={score.state.status} lastRunAt={score.state.lastRunAt} htmlUrl={score.state.htmlUrl} />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
            {visibleProspects.length} auditados sin calificar
            {totalMatching > prospects.length ? ` (mostrando los primeros ${prospects.length} de ${totalMatching})` : ''}
          </h3>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-48"
          />
        </div>

        {loading ? (
          <p className="font-mono text-xs text-parchmentDim">Cargando...</p>
        ) : visibleProspects.length === 0 ? (
          <p className="font-mono text-xs text-parchmentDim">
            No hay pendientes de calificar con estos filtros. Ve a "Buscar" para auditar más.
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
                <th className="py-2">
                  <span title="¿Encontramos un sitio web funcionando para este negocio?">Sitio web</span>
                </th>
                <th className="py-2">
                  <span title="Puntaje de velocidad del sitio (0-100, entre más alto mejor)">PageSpeed</span>
                </th>
                <th className="py-2 pr-2">Auditado</th>
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
                  <td className="py-2 font-mono text-xs">
                    {p.audit_has_website ? (
                      <span className="text-signal">sí{p.has_ssl === false ? ' (sin SSL)' : ''}</span>
                    ) : (
                      <span className="text-alert">no</span>
                    )}
                  </td>
                  <td className="py-2 font-mono text-xs tabular text-parchmentDim">
                    {p.pagespeed_score ?? '—'}
                  </td>
                  <td className="py-2 pr-2 font-mono text-xs text-parchmentDim">{timeAgo(p.audit_date)}</td>
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
            onClick={scoreSelected}
            disabled={score.state.status === 'running'}
            className="rounded-sm bg-brass px-4 py-1.5 font-mono text-xs text-ink hover:opacity-90 disabled:opacity-50"
          >
            {score.state.status === 'running' ? 'Calificando...' : 'Calificar seleccionados'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="font-mono text-xs text-parchmentDim hover:text-parchment">
            cancelar
          </button>
        </div>
      )}
    </div>
  )
}
