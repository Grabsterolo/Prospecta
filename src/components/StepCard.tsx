import { timeAgo } from '../lib/time'

export type StepStatus = 'idle' | 'running' | 'success' | 'error' | 'never'

interface StepCardProps {
  stepNumber: number
  title: string
  description: string
  status: StepStatus
  lastRunAt: string | null
  htmlUrl: string | null
  statValue: string | number | null
  statLabel: string
  onRun: () => void
  runDisabled?: boolean
  children?: React.ReactNode
}

const STATUS_LABEL: Record<StepStatus, string> = {
  idle: 'Listo para correr',
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

export default function StepCard({
  stepNumber,
  title,
  description,
  status,
  lastRunAt,
  htmlUrl,
  statValue,
  statLabel,
  onRun,
  runDisabled,
  children,
}: StepCardProps) {
  const color = STATUS_COLOR[status]

  return (
    <div className="flex flex-1 flex-col rounded-sm border border-hairline bg-panel p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-panel2 font-mono text-[11px] text-brass">
          {stepNumber}
        </span>
        <h2 className="font-display text-base text-parchment">{title}</h2>
      </div>
      <p className="mb-4 text-xs text-parchmentDim">{description}</p>

      <div className="mb-4 flex items-baseline gap-2">
        <span className="font-mono text-2xl text-brass tabular">{statValue ?? '—'}</span>
        <span className="font-mono text-[11px] text-parchmentDim">{statLabel}</span>
      </div>

      {children && <div className="mb-4 space-y-2">{children}</div>}

      <button
        onClick={onRun}
        disabled={runDisabled || status === 'running'}
        className="mb-3 rounded-sm bg-brass px-4 py-2 font-mono text-xs text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === 'running' ? 'Corriendo...' : `Correr paso ${stepNumber}`}
      </button>

      <div className="mt-auto flex items-center justify-between border-t border-hairline pt-2 font-mono text-[11px]">
        <span style={{ color }}>{STATUS_LABEL[status]}</span>
        <div className="flex items-center gap-2 text-parchmentDim">
          <span>{timeAgo(lastRunAt)}</span>
          {htmlUrl && (
            <a href={htmlUrl} target="_blank" rel="noreferrer" className="underline hover:text-brass">
              ver log
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
