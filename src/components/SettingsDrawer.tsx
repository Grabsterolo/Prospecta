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

interface StatusMessage {
  kind: 'success' | 'error'
  text: string
}

// Rubros comunes con su tag de OpenStreetMap ya resuelto, para que agregar un
// rubro nuevo no requiera saber la sintaxis de OSM (key=value).
const COMMON_CATEGORIES = [
  { label: 'Dentistas', tag: 'healthcare=dentist' },
  { label: 'Veterinarias', tag: 'amenity=veterinary' },
  { label: 'Clínicas médicas', tag: 'amenity=clinic' },
  { label: 'Farmacias', tag: 'amenity=pharmacy' },
  { label: 'Restaurantes', tag: 'amenity=restaurant' },
  { label: 'Cafeterías', tag: 'amenity=cafe' },
  { label: 'Hoteles', tag: 'tourism=hotel' },
  { label: 'Bufetes legales', tag: 'office=lawyer' },
  { label: 'Contadores', tag: 'office=accountant' },
  { label: 'Aseguradoras', tag: 'office=insurance' },
  { label: 'Arquitectos', tag: 'office=architect' },
  { label: 'Bienes raíces', tag: 'office=estate_agent' },
  { label: 'Talleres automotrices', tag: 'shop=car_repair' },
  { label: 'Ópticas', tag: 'shop=optician' },
  { label: 'Peluquerías / salones de belleza', tag: 'shop=hairdresser' },
  { label: 'Spas', tag: 'shop=beauty' },
  { label: 'Centros de masajes', tag: 'shop=massage' },
  { label: 'Gimnasios', tag: 'leisure=fitness_centre' },
]

export default function SettingsDrawer({ open, onClose, categories, scanTargets, onReload }: SettingsDrawerProps) {
  const [presetChoice, setPresetChoice] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newOsmArea, setNewOsmArea] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<StatusMessage | null>(null)

  if (!open) return null

  function handlePresetChange(value: string) {
    setPresetChoice(value)
    if (value === '' || value === 'custom') {
      if (value === '') {
        setNewTag('')
        setNewLabel('')
        setNewKey('')
      }
      return
    }
    const preset = COMMON_CATEGORIES.find((p) => p.tag === value)
    if (preset) {
      setNewTag(preset.tag)
      setNewLabel(preset.label)
      setNewKey(preset.tag.split('=')[1] ?? preset.tag)
    }
  }

  async function toggleCategory(cat: TargetCategory) {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: cat.id, active: !cat.active }),
      })
      if (!response.ok) throw new Error()
      onReload()
    } catch {
      setStatus({ kind: 'error', text: `No se pudo actualizar "${cat.label_es}". Intenta de nuevo.` })
    }
  }

  async function toggleTarget(target: ScanTarget) {
    try {
      const response = await fetch('/api/scan-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: target.id, active: !target.active }),
      })
      if (!response.ok) throw new Error()
      onReload()
    } catch {
      setStatus({ kind: 'error', text: `No se pudo actualizar "${target.label}". Intenta de nuevo.` })
    }
  }

  async function addCategory() {
    if (!newKey || !newTag || !newLabel) {
      setStatus({ kind: 'error', text: 'Elige un rubro de la lista, o completa clave y tag OSM en modo avanzado.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', category_key: newKey, osm_tag: newTag, label_es: newLabel }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el rubro')
      setStatus({ kind: 'success', text: `Rubro "${newLabel}" agregado.` })
      setPresetChoice('')
      setNewKey('')
      setNewTag('')
      setNewLabel('')
      onReload()
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function addTarget() {
    if (!newCity || !newCountry) {
      setStatus({ kind: 'error', text: 'Completa al menos ciudad y país.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/scan-targets', {
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
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la ciudad')
      setStatus({ kind: 'success', text: `Ciudad "${newCity}" agregada.` })
      setNewCity('')
      setNewCountry('')
      setNewOsmArea('')
      onReload()
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
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

        {status && (
          <div
            className={`mb-4 rounded-sm border px-3 py-2 text-xs ${
              status.kind === 'success'
                ? 'border-signal/40 bg-signal/10 text-signal'
                : 'border-alert/40 bg-alert/10 text-alert'
            }`}
          >
            {status.text}
          </div>
        )}

        <section className="mb-8">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-parchmentDim">Rubros</h3>
          {categories.length === 0 ? (
            <p className="font-mono text-xs text-parchmentDim">Todavía no hay rubros configurados.</p>
          ) : (
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
          )}
          <div className="mt-3 space-y-2 border-t border-hairline pt-3">
            <p className="font-mono text-[11px] text-parchmentDim">Agregar rubro nuevo</p>
            <select value={presetChoice} onChange={(e) => handlePresetChange(e.target.value)} className="w-full">
              <option value="">Elige un tipo de negocio...</option>
              {COMMON_CATEGORIES.map((p) => (
                <option key={p.tag} value={p.tag}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Otro (avanzado)</option>
            </select>
            {presetChoice === 'custom' && (
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="tag técnico de OpenStreetMap (ej. office=lawyer)"
                className="w-full"
              />
            )}
            {presetChoice && (
              <>
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="nombre visible" className="w-full" />
                <button
                  onClick={addCategory}
                  disabled={busy}
                  className="rounded-sm bg-brass px-3 py-1.5 font-mono text-xs text-ink disabled:opacity-50"
                >
                  Agregar rubro
                </button>
              </>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-parchmentDim">Ciudades</h3>
          {scanTargets.length === 0 ? (
            <p className="font-mono text-xs text-parchmentDim">Todavía no hay ciudades configuradas.</p>
          ) : (
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
          )}
          <div className="mt-3 space-y-2 border-t border-hairline pt-3">
            <p className="font-mono text-[11px] text-parchmentDim">Agregar ciudad nueva</p>
            <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="ciudad" className="w-full" />
            <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="país (código, ej. US)" className="w-full" />
            <input
              value={newOsmArea}
              onChange={(e) => setNewOsmArea(e.target.value)}
              placeholder="área OSM (opcional, igual a la ciudad si se deja vacío)"
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
