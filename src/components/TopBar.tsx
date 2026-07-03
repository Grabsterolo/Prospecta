interface TopBarProps {
  totalProspects: number
  onOpenSettings: () => void
}

export default function TopBar({ totalProspects, onOpenSettings }: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-hairline px-8 py-5">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-2xl tracking-wide text-parchment">Prospecta</h1>
        <span className="font-mono text-xs text-parchmentDim">radar comercial</span>
      </div>

      <div className="flex items-center gap-6 font-mono text-xs text-parchmentDim">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          <span>{totalProspects} prospectos detectados</span>
        </div>
        <button onClick={onOpenSettings} className="text-parchmentDim hover:text-brass" title="Configuración">
          ⚙ configuración
        </button>
      </div>
    </header>
  )
}
