import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TargetCategory } from '../types'
import { useWorkflow } from '../lib/useWorkflow'
import StatusBadge from './StatusBadge'
import { timeAgo } from '../lib/time'

interface ScanTarget {
  id: string
  city: string
  country: string
  label: string
}

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
  scanTargets: ScanTarget[]
}

export default function AuditedSection({ categories, scanTargets }: AuditedSectionProps) {
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [prospects, setProspects] = useState<AuditedProspect[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const score = useWorkflow('score')

  const loadProspects = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('prospect_overview')
      .select('id, name, city, category, audit_date, audit_has_website, pagespeed_score, has_ssl')
      .eq('audited', true)
      .is('score_total', null)
      .order('audit_date', { ascending: false })
      .limit(200)

    if (filterCity) query = query.eq('city', filterCity)
    if (filterCategory) query = query.eq('category', filterCategory)

    const { data, error } = await query
    if (error) {
      console.error(error)
      setProspects([])
    } else {
      setProspects(data ?? [])
    }
    setLoading(false)
  }, [filterCity, filterCategory])

  useEffect(() => {
    loadProspects()
  }, [loadProspects])

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const allSelected = prospects.length > 0 && prospects.every((p) => prev.has(p.id))
      return allSelected ? new Set() : new Set(prospects.map((p) => p.id))
    })
  }

  function scoreSelected() {
    if (selectedIds.size === 0) return
    score.trigger({ prospect_ids: Array.from(selectedIds).join(',') }, loadProspects)
    setSelectedIds(new Set())
  }

  function scoreAll() {
    score.trigger({}, loadProspects)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-hairline bg-panel p-5">
        <h2 className="mb-1 font-display text-lg text-parchment">2. Prospectos auditados</h2>
        <p className="mb-4 text-sm text-parchmentDim">
          Ya se midió su presencia digital. Elige a cuáles calcularles prioridad y oferta sugerida.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="">Todas las ciudades</option>
            {Array.from(new Set(scanTargets.map((t) => t.city))).map((city) => (
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
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
          {prospects.length} auditados sin calificar
        </h3>

        {loading ? (
          <p className="font-mono text-xs text-parchmentDim">Cargando...</p>
        ) : prospects.length === 0 ? (
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
                    checked={prospects.length > 0 && prospects.every((p) => selectedIds.has(p.id))}
                    onChange={toggleAll}
                  />
                </th>
                <th className="py-2">Negocio</th>
                <th className="py-2">Ciudad</th>
                <th className="py-2">Sitio web</th>
                <th className="py-2">PageSpeed</th>
                <th className="py-2 pr-2">Auditado</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
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
