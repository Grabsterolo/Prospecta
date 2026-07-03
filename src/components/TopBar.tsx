interface TopBarProps {
  totalProspects: number
  lastScanLabel: string
}

export default function TopBar({ totalProspects, lastScanLabel }: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-hairline bg-panel/40 px-8 py-5 backdrop-blur-sm">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-2xl tracking-wide text-parchment">Prospecta</h1>
        <span className="font-mono text-xs text-parchmentDim">radar comercial</span>
      </div>

      <div className="flex items-center gap-3 font-mono text-xs text-parchmentDim">
        <div className="flex items-center gap-2 rounded-full bg-panel2 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_6px_rgba(127,169,140,0.7)]" />
          <span>{totalProspects} prospectos en el radar</span>
        </div>
        <div className="rounded-full bg-panel2 px-3 py-1.5">última corrida: {lastScanLabel}</div>
      </div>
    </header>
  )
}
