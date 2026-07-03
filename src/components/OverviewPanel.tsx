import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SignalDial from './SignalDial'

interface CategoryStat {
  category: string
  total: number
  auditados: number
  calificados: number
}

interface CityStat {
  city: string
  country: string
  total: number
  auditados: number
  calificados: number
}

interface TopProspect {
  id: string
  name: string | null
  city: string | null
  score_total: number | null
  suggested_offer: string | null
}

const OFFER_LABELS: Record<string, string> = {
  sitio_web: 'Sitio web',
  dashboard: 'Dashboard',
  asistente_ia: 'Asistente IA',
  automatizacion: 'Automatización',
}

export default function OverviewPanel() {
  const [totals, setTotals] = useState({ detectados: 0, auditados: 0, calificados: 0 })
  const [byCategory, setByCategory] = useState<CategoryStat[]>([])
  const [byCity, setByCity] = useState<CityStat[]>([])
  const [topProspects, setTopProspects] = useState<TopProspect[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [totalRes, auditedRes, scoredRes, catRes, cityRes, topRes] = await Promise.all([
        supabase.from('prospects').select('*', { count: 'exact', head: true }),
        supabase.from('prospect_overview').select('*', { count: 'exact', head: true }).eq('audited', true),
        supabase.from('scores').select('*', { count: 'exact', head: true }),
        supabase.from('stats_by_category').select('*').order('total', { ascending: false }).limit(8),
        supabase.from('stats_by_city').select('*').order('total', { ascending: false }).limit(8),
        supabase
          .from('prospect_overview')
          .select('id, name, city, score_total, suggested_offer')
          .not('score_total', 'is', null)
          .order('score_total', { ascending: false })
          .limit(5),
      ])

      setTotals({
        detectados: totalRes.count ?? 0,
        auditados: auditedRes.count ?? 0,
        calificados: scoredRes.count ?? 0,
      })
      setByCategory(catRes.data ?? [])
      setByCity(cityRes.data ?? [])
      setTopProspects(topRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="font-mono text-xs text-parchmentDim">Cargando panel...</p>

  const maxCategory = Math.max(...byCategory.map((c) => c.total), 1)
  const maxCity = Math.max(...byCity.map((c) => c.total), 1)

  return (
    <div className="space-y-8">
      {/* Embudo */}
      <div className="grid grid-cols-3 gap-4">
        <FunnelCard label="Detectados" value={totals.detectados} color="#9CA3A8" />
        <FunnelCard label="Auditados" value={totals.auditados} color="#7FA98C" />
        <FunnelCard label="Calificados" value={totals.calificados} color="#C9974C" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Por rubro */}
        <div className="rounded-sm border border-hairline bg-panel p-5">
          <h2 className="mb-4 font-display text-base text-parchment">Por rubro</h2>
          <div className="space-y-2">
            {byCategory.map((c) => (
              <BarRow key={c.category} label={c.category ?? '—'} value={c.total} max={maxCategory} />
            ))}
          </div>
        </div>

        {/* Por ciudad */}
        <div className="rounded-sm border border-hairline bg-panel p-5">
          <h2 className="mb-4 font-display text-base text-parchment">Por ciudad</h2>
          <div className="space-y-2">
            {byCity.map((c) => (
              <BarRow key={`${c.city}-${c.country}`} label={`${c.city} (${c.country})`} value={c.total} max={maxCity} />
            ))}
          </div>
        </div>
      </div>

      {/* Top prospectos */}
      <div className="rounded-sm border border-hairline bg-panel p-5">
        <h2 className="mb-4 font-display text-base text-parchment">Mejores prospectos</h2>
        {topProspects.length === 0 ? (
          <p className="font-mono text-xs text-parchmentDim">Todavía no hay prospectos calificados.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {topProspects.map((p) => (
              <div key={p.id} className="flex items-center gap-4">
                <SignalDial score={p.score_total} size={36} />
                <div className="flex-1">
                  <p className="text-sm text-parchment">{p.name}</p>
                  <p className="text-xs text-parchmentDim">{p.city}</p>
                </div>
                {p.suggested_offer && (
                  <span className="rounded-sm bg-panel2 px-2 py-1 font-mono text-xs text-brass">
                    {OFFER_LABELS[p.suggested_offer] ?? p.suggested_offer}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FunnelCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-panel p-5">
      <p className="font-mono text-3xl tabular" style={{ color }}>
        {value.toLocaleString()}
      </p>
      <p className="font-mono text-[11px] uppercase tracking-wider text-parchmentDim">{label}</p>
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max((value / max) * 100, 4)
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[11px] text-parchmentDim">
        <span>{label}</span>
        <span className="tabular">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-panel2">
        <div className="h-1.5 rounded-full bg-brass" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
