import { OutreachStatus, ProspectWithScore } from '../types'
import SignalDial from './SignalDial'
import ContactLink from './ContactLink'

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

const STATUS_OPTIONS: OutreachStatus[] = [
  'nuevo',
  'contactado',
  'respondio',
  'propuesta_enviada',
  'cerrado',
  'descartado',
]

interface PendingRow {
  id: string
  name: string | null
  city: string | null
}

interface ProspectTableProps {
  prospects: ProspectWithScore[]
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleOne?: (id: string) => void
  onToggleAll?: () => void
  onStatusChange?: (id: string, status: OutreachStatus) => void
  pendingRows?: PendingRow[]
}

export default function ProspectTable({
  prospects,
  selectable = false,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onStatusChange,
  pendingRows = [],
}: ProspectTableProps) {
  if (prospects.length === 0 && pendingRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-lg text-parchment">Sin señales todavía</p>
        <p className="mt-2 max-w-sm text-sm text-parchmentDim">
          Corre el radar para este rubro y ciudad para empezar a detectar prospectos.
        </p>
      </div>
    )
  }

  const allSelected = selectable && prospects.length > 0 && prospects.every((p) => selectedIds?.has(p.id))

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-hairline font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
          {selectable && (
            <th className="py-3 pl-2 font-normal">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
            </th>
          )}
          <th className="py-3 pl-2 font-normal">
            <span title="Qué tan urgente es contactar a este negocio (0 a 100, más alto es mejor oportunidad)">
              Señal
            </span>
          </th>
          <th className="py-3 font-normal">Negocio</th>
          <th className="py-3 font-normal">Ciudad</th>
          <th className="py-3 font-normal">Oferta sugerida</th>
          <th className="py-3 font-normal">Estado</th>
          <th className="py-3 pr-2 font-normal">Contacto</th>
        </tr>
      </thead>
      <tbody>
        {pendingRows.map((p) => (
          <tr key={p.id} className="animate-pulse border-b border-hairline/60 bg-panel2/40">
            {selectable && (
              <td className="py-3 pl-2">
                <input type="checkbox" disabled />
              </td>
            )}
            <td className="py-3 pl-2" />
            <td className="py-3 text-parchment">{p.name ?? 'Sin nombre'}</td>
            <td className="py-3 text-parchmentDim">{p.city ?? '—'}</td>
            <td className="py-3 font-mono text-xs text-brass" colSpan={3}>
              Calificando...
            </td>
          </tr>
        ))}
        {prospects.map((p) => {
          const status = statusLabels[p.status] ?? statusLabels.nuevo
          return (
            <tr key={p.id} className="border-b border-hairline/60 transition-colors hover:bg-panel">
              {selectable && (
                <td className="py-3 pl-2">
                  <input type="checkbox" checked={selectedIds?.has(p.id) ?? false} onChange={() => onToggleOne?.(p.id)} />
                </td>
              )}
              <td className="py-3 pl-2">
                <SignalDial score={p.score_total} />
              </td>
              <td className="py-3">
                <p className="text-parchment">{p.name ?? 'Sin nombre'}</p>
                {p.specialty && <p className="text-xs text-parchmentDim">{p.specialty}</p>}
              </td>
              <td className="py-3 text-parchmentDim">{p.city ?? '—'}</td>
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
                {onStatusChange ? (
                  <select
                    value={p.status}
                    onChange={(e) => onStatusChange(p.id, e.target.value as OutreachStatus)}
                    className="!w-auto !py-1 font-mono text-xs"
                    style={{ color: status.color }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s].label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-mono text-xs" style={{ color: status.color }}>
                    {status.label}
                  </span>
                )}
              </td>
              <td className="py-3 pr-2 font-mono text-xs text-parchmentDim tabular">
                <ContactLink phone={p.phone} website={p.website} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
