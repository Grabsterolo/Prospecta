import { timeAgo } from '../lib/time'

export type StepStatus = 'idle' | 'running' | 'success' | 'error' | 'never'

const STATUS_LABEL: Record<StepStatus, string> = {
  idle: 'Listo',
  running: 'Corriendo...',
  success: 'Última corrida exitosa',
  error: 'Última corrida con error',
  never: 'Nunca se ha corrido',
}

const STATUS_COLOR: Record<StepStatus, string> = {
  idle: '#9CA3A8',
  running: '#C9974C',
  success: '#7FA98C',
  error: '#B5563B',
  never: '#4A555F',
}

interface StatusBadgeProps {
  status: StepStatus
  lastRunAt: string | null
  htmlUrl: string | null
}

export default function StatusBadge({ status, lastRunAt, htmlUrl }: StatusBadgeProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px]">
      <span style={{ color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span>
      <span className="text-parchmentDim">· {timeAgo(lastRunAt)}</span>
      {htmlUrl && (
        <a href={htmlUrl} target="_blank" rel="noreferrer" className="text-parchmentDim underline hover:text-brass">
          ver log
        </a>
      )}
    </div>
  )
}
