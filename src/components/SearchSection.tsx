import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TargetCategory } from '../types'
import { useWorkflow } from '../lib/useWorkflow'
import StatusBadge from './StatusBadge'

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

export default function SearchSection({ categories, scanTargets }: SearchSectionProps) {
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [prospects, setProspects] = useState<UnauditedProspect[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const scan = useWorkflow('scan')
  const audit = useWorkflow('audit')

  useEffect(() => {
    if (scanTargets.length && !selectedTargetId) setSelectedTargetId(scanTargets[0].id)
  }, [scanTargets, selectedTargetId])

  const target = scanTargets.find((t) => t.id === selectedTargetId)

  const loadProspects = useCallback(async () => {
    if (!target) return
    setLoading(true)
    let query = supabase
      .from('prospect_overview')
      .select('id, name, category, city, country, phone, website')
      .eq('audited', false)
      .eq('city', target.city)
      .order('created_at', { ascending: false })
      .limit(200)

    if (filterCategory) query = query.eq('category', filterCategory)

    const { data, error } = await query
    if (error) {
      console.error(error)
      setProspects([])
    } else {
      setProspects(data ?? [])
    }
    setLoading(false)
  }, [target, filterCategory])

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

  function runScan() {
    if (!target) return
    scan.trigger(
      { city: target.city, country: target.country, osm_area: target.osm_area, category: filterCategory },
      loadProspects,
    )
  }

  function auditSelected() {
    if (selectedIds.size === 0) return
    audit.trigger({ prospect_ids: Array.from(selectedIds).join(',') }, loadProspects)
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-hairline bg-panel p-5">
        <h2 className="mb-1 font-display text-lg text-parchment">1. Buscar prospectos</h2>
        <p className="mb-4 text-sm text-parchmentDim">
          Elige dónde y qué rubro escanear. Los resultados nuevos y los pendientes de esa ciudad aparecen abajo.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <select value={selectedTargetId} onChange={(e) => setSelectedTargetId(e.target.value)}>
            {scanTargets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
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
        <StatusBadge status={scan.state.status} lastRunAt={scan.state.lastRunAt} htmlUrl={scan.state.htmlUrl} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
            {prospects.length} sin auditar en {target?.label ?? '—'}
          </h3>
        </div>

        {loading ? (
          <p className="font-mono text-xs text-parchmentDim">Cargando...</p>
        ) : prospects.length === 0 ? (
          <p className="font-mono text-xs text-parchmentDim">
            No hay prospectos sin auditar aquí. Corre una búsqueda o revisa otra ciudad/rubro.
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
                <th className="py-2">Rubro</th>
                <th className="py-2 pr-2">Contacto</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
                <tr key={p.id} className="border-b border-hairline/60 hover:bg-panel">
                  <td className="py-2 pl-2">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} />
                  </td>
                  <td className="py-2 text-parchment">{p.name ?? 'Sin nombre'}</td>
                  <td className="py-2 font-mono text-xs text-parchmentDim">{p.category}</td>
                  <td className="py-2 pr-2 font-mono text-xs text-parchmentDim tabular">
                    {p.phone ?? p.website ?? '—'}
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
