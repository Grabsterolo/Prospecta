import { useMemo } from 'react'

interface Blip {
  x: number
  y: number
  delay: number
  color: string
}

const RINGS = [30, 55, 80, 105]
const CENTER = 120

function polar(r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}

export default function RadarAnimation({ size = 220 }: { size?: number }) {
  const blips = useMemo<Blip[]>(() => {
    const angles = [15, 95, 155, 205, 265, 330]
    const radii = [38, 62, 48, 92, 72, 44]
    const colors = ['#C9974C', '#7FA98C', '#C9974C', '#7FA98C', '#C9974C', '#7FA98C']
    return angles.map((a, i) => {
      const { x, y } = polar(radii[i], a)
      return { x, y, delay: i * 0.4, color: colors[i] }
    })
  }, [])

  const links: [number, number][] = [
    [0, 1],
    [1, 3],
    [2, 4],
    [4, 5],
    [0, 2],
  ]

  const sweepEnd = polar(105, 55)

  return (
    <div className="mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7FA98C" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7FA98C" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C9974C" stopOpacity="0" />
            <stop offset="100%" stopColor="#C9974C" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={105} fill="url(#radarGlow)" />

        {RINGS.map((r) => (
          <circle key={r} cx={CENTER} cy={CENTER} r={r} fill="none" stroke="#2B3642" strokeWidth={1} />
        ))}
        <line x1={CENTER - 105} y1={CENTER} x2={CENTER + 105} y2={CENTER} stroke="#2B3642" strokeWidth={1} />
        <line x1={CENTER} y1={CENTER - 105} x2={CENTER} y2={CENTER + 105} stroke="#2B3642" strokeWidth={1} />

        <g className="radar-sweep" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
          <path
            d={`M ${CENTER} ${CENTER} L ${CENTER + 105} ${CENTER} A 105 105 0 0 1 ${sweepEnd.x} ${sweepEnd.y} Z`}
            fill="url(#sweepGradient)"
          />
        </g>

        {links.map(([a, b], i) => (
          <line
            key={`${a}-${b}`}
            x1={blips[a].x}
            y1={blips[a].y}
            x2={blips[b].x}
            y2={blips[b].y}
            stroke="#C9974C"
            strokeWidth={0.75}
            strokeDasharray={4}
            className="radar-link"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}

        {blips.map((b, i) => (
          <g key={i}>
            <circle
              cx={b.x}
              cy={b.y}
              r={9}
              fill="none"
              stroke={b.color}
              strokeWidth={1}
              className="radar-ping"
              style={{ animationDelay: `${b.delay}s` }}
            />
            <circle cx={b.x} cy={b.y} r={3} fill={b.color} className="radar-blink" style={{ animationDelay: `${b.delay}s` }} />
          </g>
        ))}

        <circle cx={CENTER} cy={CENTER} r={3.5} fill="#EDE7D9" />
      </svg>
    </div>
  )
}
