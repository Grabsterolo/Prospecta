import { TargetCategory } from '../types'

interface CategoryFilterProps {
  categories: TargetCategory[]
  activeKey: string | null
  onSelect: (key: string | null) => void
}

export default function CategoryFilter({ categories, activeKey, onSelect }: CategoryFilterProps) {
  return (
    <aside className="w-60 shrink-0 border-r border-hairline px-4 py-6">
      <p className="mb-3 px-2 font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
        rubros
      </p>
      <nav className="flex flex-col gap-0.5">
        <button
          onClick={() => onSelect(null)}
          className={`rounded-lg border-l-2 px-3 py-2 text-left text-sm transition-colors ${
            activeKey === null
              ? 'border-brass bg-panel2 text-brass'
              : 'border-transparent text-parchmentDim hover:bg-panel2/60 hover:text-parchment'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category_key}
            onClick={() => onSelect(cat.category_key)}
            className={`flex items-center justify-between rounded-lg border-l-2 px-3 py-2 text-left text-sm transition-colors ${
              activeKey === cat.category_key
                ? 'border-brass bg-panel2 text-brass'
                : 'border-transparent text-parchmentDim hover:bg-panel2/60 hover:text-parchment'
            }`}
          >
            <span>{cat.label_es}</span>
            {!cat.active && (
              <span className="rounded-full bg-alert/10 px-1.5 py-0.5 font-mono text-[10px] text-alert">
                pausado
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}
