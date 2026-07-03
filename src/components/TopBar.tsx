interface TopBarProps {
  totalProspects: number
}

export default function TopBar({ totalProspects }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-8 pt-5">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-2xl tracking-wide text-parchment">Prospecta</h1>
        <span className="font-mono text-xs text-parchmentDim">radar comercial</span>
      </div>
      <div className="flex items-center gap-2 font-mono text-xs text-parchmentDim">
        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
        <span>{totalProspects} prospectos detectados</span>
      </div>
    </header>
  )
}
