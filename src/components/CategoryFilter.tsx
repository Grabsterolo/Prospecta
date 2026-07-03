import { TargetCategory } from '../types'

interface CategoryFilterProps {
  categories: TargetCategory[]
  activeKey: string | null
  onSelect: (key: string | null) => void
}

export default function CategoryFilter({ categories, activeKey, onSelect }: CategoryFilterProps) {
  return (
    <aside className="w-56 shrink-0 border-r border-hairline px-5 py-6">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
        rubros
      </p>
      <nav className="flex flex-col gap-1">
        <button
          onClick={() => onSelect(null)}
          className={`rounded-sm px-3 py-2 text-left text-sm transition-colors ${
            activeKey === null
              ? 'bg-panel2 text-brass'
              : 'text-parchmentDim hover:bg-panel2 hover:text-parchment'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category_key}
            onClick={() => onSelect(cat.category_key)}
            className={`flex items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition-colors ${
              activeKey === cat.category_key
                ? 'bg-panel2 text-brass'
                : 'text-parchmentDim hover:bg-panel2 hover:text-parchment'
            }`}
          >
            <span>{cat.label_es}</span>
            {!cat.active && (
              <span className="font-mono text-[10px] text-alert">pausado</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}
