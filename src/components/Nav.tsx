export type Section = 'overview' | 'search' | 'audited' | 'scored'

const ITEMS: { key: Section; label: string }[] = [
  { key: 'overview', label: 'Panel general' },
  { key: 'search', label: 'Buscar' },
  { key: 'audited', label: 'Auditados' },
  { key: 'scored', label: 'Calificados' },
]

interface NavProps {
  active: Section
  onChange: (s: Section) => void
  onOpenSettings: () => void
}

export default function Nav({ active, onChange, onOpenSettings }: NavProps) {
  return (
    <nav className="flex items-center justify-between border-b border-hairline px-8 py-3">
      <div className="flex gap-1">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`rounded-sm px-3 py-1.5 font-mono text-xs transition-colors ${
              active === item.key ? 'bg-panel2 text-brass' : 'text-parchmentDim hover:text-parchment'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button onClick={onOpenSettings} className="font-mono text-xs text-parchmentDim hover:text-brass">
        ⚙ configuración
      </button>
    </nav>
  )
}
