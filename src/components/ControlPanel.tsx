import { useEffect, useState } from 'react'
import { TargetCategory } from '../types'

type WorkflowName = 'scan' | 'audit' | 'score'

interface StatusMessage {
  kind: 'success' | 'error'
  text: string
}

async function triggerWorkflow(workflow: WorkflowName, inputs: Record<string, string>) {
  const response = await fetch('/api/run-workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow, inputs }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Error desconocido')
  return data
}

export default function ControlPanel() {
  const [categories, setCategories] = useState<TargetCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [status, setStatus] = useState<StatusMessage | null>(null)

  // Estado del formulario de radar
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [osmArea, setOsmArea] = useState('')
  const [scanCategory, setScanCategory] = useState('')
  const [scanLoading, setScanLoading] = useState(false)

  // Estado del formulario de auditoría
  const [batchSize, setBatchSize] = useState('40')
  const [auditLoading, setAuditLoading] = useState(false)

  const [scoreLoading, setScoreLoading] = useState(false)

  // Estado del formulario de nuevo rubro
  const [newKey, setNewKey] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  async function loadCategories() {
    setLoadingCategories(true)
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch {
      setStatus({ kind: 'error', text: 'No se pudieron cargar los rubros.' })
    } finally {
      setLoadingCategories(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  async function handleScan() {
    setScanLoading(true)
    setStatus(null)
    try {
      await triggerWorkflow('scan', { city, country, osm_area: osmArea, category: scanCategory })
      setStatus({ kind: 'success', text: 'Radar disparado. Revisa la pestaña Actions en GitHub en unos segundos.' })
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setScanLoading(false)
    }
  }

  async function handleAudit() {
    setAuditLoading(true)
    setStatus(null)
    try {
      await triggerWorkflow('audit', { batch_size: batchSize })
      setStatus({ kind: 'success', text: 'Auditoría disparada.' })
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setAuditLoading(false)
    }
  }

  async function handleScore() {
    setScoreLoading(true)
    setStatus(null)
    try {
      await triggerWorkflow('score', {})
      setStatus({ kind: 'success', text: 'Cálculo de scores disparado.' })
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setScoreLoading(false)
    }
  }

  async function toggleCategory(cat: TargetCategory) {
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, active: !c.active } : c)),
    )
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: cat.id, active: !cat.active }),
      })
      if (!response.ok) throw new Error('No se pudo actualizar')
    } catch {
      setStatus({ kind: 'error', text: `No se pudo actualizar ${cat.label_es}.` })
      loadCategories()
    }
  }

  async function handleAddCategory() {
    if (!newKey || !newTag || !newLabel) {
      setStatus({ kind: 'error', text: 'Completa clave, tag OSM y nombre para agregar un rubro.' })
      return
    }
    setAddingCategory(true)
    setStatus(null)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', category_key: newKey, osm_tag: newTag, label_es: newLabel }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear')
      setStatus({ kind: 'success', text: `Rubro "${newLabel}" agregado.` })
      setNewKey('')
      setNewTag('')
      setNewLabel('')
      loadCategories()
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setAddingCategory(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      {status && (
        <div
          className={`rounded-sm border px-4 py-3 text-sm ${
            status.kind === 'success'
              ? 'border-signal/40 bg-panel2 text-signal'
              : 'border-alert/40 bg-panel2 text-alert'
          }`}
        >
          {status.text}
        </div>
      )}

      <Section title="Radar de prospectos" description="Escanea una ciudad puntual, o deja los campos vacíos para usar scan-targets.json">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Miami" />
          </Field>
          <Field label="País">
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" />
          </Field>
          <Field label="Área OSM (opcional)">
            <input value={osmArea} onChange={(e) => setOsmArea(e.target.value)} placeholder="igual a la ciudad si se deja vacío" />
          </Field>
          <Field label="Rubro (opcional)">
            <select value={scanCategory} onChange={(e) => setScanCategory(e.target.value)}>
              <option value="">Todos los activos</option>
              {categories.map((c) => (
                <option key={c.category_key} value={c.category_key}>
                  {c.label_es}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <ActionButton onClick={handleScan} loading={scanLoading} label="Correr radar" />
      </Section>

      <Section title="Auditoría de sitios" description="Verifica y mide los prospectos pendientes en lotes">
        <Field label="Cantidad a auditar">
          <input
            type="number"
            min={1}
            value={batchSize}
            onChange={(e) => setBatchSize(e.target.value)}
            className="w-32"
          />
        </Field>
        <ActionButton onClick={handleAudit} loading={auditLoading} label="Correr auditoría" />
      </Section>

      <Section title="Calcular scores" description="Recalcula prioridad y oferta sugerida para todos los prospectos auditados">
        <ActionButton onClick={handleScore} loading={scoreLoading} label="Calcular scores" />
      </Section>

      <Section title="Rubros" description="Activa, pausa o agrega rubros que el radar debe escanear">
        {loadingCategories ? (
          <p className="font-mono text-xs text-parchmentDim">Cargando...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-sm border border-hairline px-3 py-2"
              >
                <div>
                  <p className="text-sm text-parchment">{cat.label_es}</p>
                  <p className="font-mono text-[11px] text-parchmentDim">{cat.category_key}</p>
                </div>
                <button
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-sm px-3 py-1 font-mono text-xs transition-colors ${
                    cat.active
                      ? 'bg-signal/20 text-signal'
                      : 'bg-hairline/40 text-parchmentDim'
                  }`}
                >
                  {cat.active ? 'activo' : 'pausado'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-hairline pt-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
            Agregar rubro nuevo
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Clave (category_key)">
              <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="law_firm" />
            </Field>
            <Field label="Tag OSM (key=value)">
              <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="office=lawyer" />
            </Field>
            <Field label="Nombre visible">
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Bufetes legales" />
            </Field>
          </div>
          <ActionButton onClick={handleAddCategory} loading={addingCategory} label="Agregar rubro" />
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-sm border border-hairline bg-panel p-5">
      <h2 className="font-display text-lg text-parchment">{title}</h2>
      <p className="mb-4 text-sm text-parchmentDim">{description}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[11px] uppercase tracking-wider text-parchmentDim">{label}</span>
      {children}
    </label>
  )
}

function ActionButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void
  loading: boolean
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-sm bg-brass px-4 py-2 font-mono text-xs text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {loading ? 'Enviando...' : label}
    </button>
  )
}
