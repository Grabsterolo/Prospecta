import { useState } from 'react'
import { TargetCategory } from '../types'

interface ScanTarget {
  id: string
  city: string
  country: string
  osm_area: string
  label: string
  active: boolean
}

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
  categories: TargetCategory[]
  scanTargets: ScanTarget[]
  onReload: () => void
}

export default function SettingsDrawer({ open, onClose, categories, scanTargets, onReload }: SettingsDrawerProps) {
  const [newKey, setNewKey] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newOsmArea, setNewOsmArea] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function toggleCategory(cat: TargetCategory) {
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id: cat.id, active: !cat.active }),
    })
    onReload()
  }

  async function toggleTarget(target: ScanTarget) {
    await fetch('/api/scan-targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id: target.id, active: !target.active }),
    })
    onReload()
  }

  async function addCategory() {
    if (!newKey || !newTag || !newLabel) return
    setBusy(true)
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', category_key: newKey, osm_tag: newTag, label_es: newLabel }),
    })
    setNewKey('')
    setNewTag('')
    setNewLabel('')
    setBusy(false)
    onReload()
  }

  async function addTarget() {
    if (!newCity || !newCountry) return
    setBusy(true)
    await fetch('/api/scan-targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        city: newCity,
        country: newCountry,
        osm_area: newOsmArea || newCity,
        label: `${newCity} (${newCountry})`,
      }),
    })
    setNewCity('')
    setNewCountry('')
    setNewOsmArea('')
    setBusy(false)
    onReload()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-hairline bg-ink p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl text-parchment">Configuración</h2>
          <button onClick={onClose} className="font-mono text-xs text-parchmentDim hover:text-brass">
            cerrar ✕
          </button>
        </div>

        <section className="mb-8">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-parchmentDim">Rubros</h3>
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-sm border border-hairline px-3 py-2">
                <span className="text-sm text-parchment">{cat.label_es}</span>
                <button
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-sm px-2 py-1 font-mono text-[11px] ${
                    cat.active ? 'bg-signal/20 text-signal' : 'bg-hairline/40 text-parchmentDim'
                  }`}
                >
                  {cat.active ? 'activo' : 'pausado'}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-hairline pt-3">
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="clave (law_firm)" className="w-full" />
            <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="tag OSM (office=lawyer)" className="w-full" />
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="nombre visible" className="w-full" />
            <button
              onClick={addCategory}
              disabled={busy}
              className="rounded-sm bg-brass px-3 py-1.5 font-mono text-xs text-ink disabled:opacity-50"
            >
              Agregar rubro
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-parchmentDim">Ciudades</h3>
          <div className="flex flex-col gap-2">
            {scanTargets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-sm border border-hairline px-3 py-2">
                <span className="text-sm text-parchment">{t.label}</span>
                <button
                  onClick={() => toggleTarget(t)}
                  className={`rounded-sm px-2 py-1 font-mono text-[11px] ${
                    t.active ? 'bg-signal/20 text-signal' : 'bg-hairline/40 text-parchmentDim'
                  }`}
                >
                  {t.active ? 'activa' : 'pausada'}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-hairline pt-3">
            <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="ciudad" className="w-full" />
            <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="país (código, ej. US)" className="w-full" />
            <input
              value={newOsmArea}
              onChange={(e) => setNewOsmArea(e.target.value)}
              placeholder="área OSM (opcional)"
              className="w-full"
            />
            <button
              onClick={addTarget}
              disabled={busy}
              className="rounded-sm bg-brass px-3 py-1.5 font-mono text-xs text-ink disabled:opacity-50"
            >
              Agregar ciudad
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
