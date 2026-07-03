interface SignalDialProps {
  score: number | null
  size?: number
}

function tierColor(score: number): string {
  if (score >= 70) return '#C9974C' // brass — señal fuerte
  if (score >= 40) return '#7FA98C' // signal — señal media
  return '#4A555F' // hairline apagado — señal débil
}

export default function SignalDial({ score, size = 44 }: SignalDialProps) {
  const value = score ?? 0
  const radius = size / 2 - 4
  const circumference = 2 * Math.PI * radius
  const arcFraction = 0.75 // gauge de 270 grados, como un instrumento
  const arcLength = circumference * arcFraction
  const filled = arcLength * (value / 100)
  const color = tierColor(value)

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={score === null ? 'Sin calcular' : `Señal ${score} de 100`}
      title={
        score === null
          ? 'Todavía no se calcula la prioridad de este prospecto'
          : `Prioridad de contacto: ${score} de 100 (más alto = más urgente)`
      }
    >
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2B3642"
          strokeWidth={3}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      </svg>
      <span
        className="absolute font-mono text-[11px] tabular"
        style={{ color: score === null ? '#4A555F' : color }}
      >
        {score === null ? '--' : score}
      </span>
    </div>
  )
}
