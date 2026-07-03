import { ProspectWithScore } from '../types'
import SignalDial from './SignalDial'
import { timeAgo } from '../lib/time'

const offerLabels: Record<string, string> = {
  sitio_web: 'Sitio web',
  dashboard: 'Dashboard',
  asistente_ia: 'Asistente IA',
  automatizacion: 'Automatización',
}

const statusLabels: Record<string, { label: string; color: string }> = {
  nuevo: { label: 'Nuevo', color: '#7FA98C' },
  contactado: { label: 'Contactado', color: '#C9974C' },
  respondio: { label: 'Respondió', color: '#C9974C' },
  propuesta_enviada: { label: 'Propuesta enviada', color: '#C9974C' },
  cerrado: { label: 'Cerrado', color: '#7FA98C' },
  descartado: { label: 'Descartado', color: '#4A555F' },
}

interface ProspectTableProps {
  prospects: ProspectWithScore[]
  selectedIds: Set<string>
  onToggleOne: (id: string) => void
  onToggleAll: () => void
}

export default function ProspectTable({ prospects, selectedIds, onToggleOne, onToggleAll }: ProspectTableProps) {
  if (prospects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-lg text-parchment">Sin señales todavía</p>
        <p className="mt-2 max-w-sm text-sm text-parchmentDim">
          Corre el radar para este rubro y ciudad para empezar a detectar prospectos.
        </p>
      </div>
    )
  }

  const allSelected = prospects.length > 0 && prospects.every((p) => selectedIds.has(p.id))

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-hairline font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
          <th className="py-3 pl-2 font-normal">
            <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
          </th>
          <th className="py-3 font-normal">Señal</th>
          <th className="py-3 font-normal">Negocio</th>
          <th className="py-3 font-normal">Ciudad</th>
          <th className="py-3 font-normal">Auditoría</th>
          <th className="py-3 font-normal">Oferta sugerida</th>
          <th className="py-3 font-normal">Estado</th>
          <th className="py-3 pr-2 font-normal">Contacto</th>
        </tr>
      </thead>
      <tbody>
        {prospects.map((p) => {
          const status = statusLabels[p.status] ?? statusLabels.nuevo
          return (
            <tr
              key={p.id}
              className="border-b border-hairline/60 transition-colors hover:bg-panel"
            >
              <td className="py-3 pl-2">
                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => onToggleOne(p.id)} />
              </td>
              <td className="py-3">
                <SignalDial score={p.score_total} />
              </td>
              <td className="py-3">
                <p className="text-parchment">{p.name ?? 'Sin nombre'}</p>
                {p.specialty && <p className="text-xs text-parchmentDim">{p.specialty}</p>}
              </td>
              <td className="py-3 text-parchmentDim">{p.city ?? '—'}</td>
              <td className="py-3">
                {p.audited ? (
                  <span className="font-mono text-xs text-signal">{timeAgo(p.audit_date)}</span>
                ) : (
                  <span className="font-mono text-xs text-parchmentDim">pendiente</span>
                )}
              </td>
              <td className="py-3">
                {p.suggested_offer ? (
                  <span className="rounded-sm bg-panel2 px-2 py-1 font-mono text-xs text-brass">
                    {offerLabels[p.suggested_offer]}
                  </span>
                ) : (
                  <span className="text-parchmentDim">—</span>
                )}
              </td>
              <td className="py-3">
                <span className="font-mono text-xs" style={{ color: status.color }}>
                  {status.label}
                </span>
              </td>
              <td className="py-3 pr-2 font-mono text-xs text-parchmentDim tabular">
                {p.phone ?? p.website ?? '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
