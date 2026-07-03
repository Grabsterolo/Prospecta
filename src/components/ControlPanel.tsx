import { useEffect, useState } from 'react'
import { TargetCategory } from '../types'

type WorkflowName = 'scan' | 'audit' | 'score'

interface ScanTarget {
  id: string
  city: string
  country: string
  osm_area: string
  label: string
  active: boolean
}

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
  const [scanTargets, setScanTargets] = useState<ScanTarget[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [status, setStatus] = useState<StatusMessage | null>(null)

  // Radar: selección simple por dropdown
  const [selectedTargetId, setSelectedTargetId] = useState<string>('')
  const [scanCategory, setScanCategory] = useState('')
  const [scanLoading, setScanLoading] = useState(false)

  // Agregar ciudad nueva (solo cuando de verdad no está en la lista)
  const [showAddTarget, setShowAddTarget] = useState(false)
  const [newCity, setNewCity] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newOsmArea, setNewOsmArea] = useState('')
  const [addingTarget, setAddingTarget] = useState(false)

  // Auditoría
  const [batchSize, setBatchSize] = useState('40')
  const [auditLoading, setAuditLoading] = useState(false)

  const [scoreLoading, setScoreLoading] = useState(false)

  // Agregar rubro nuevo
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  async function loadOptions() {
    setLoadingOptions(true)
    try {
      const [catRes, targetRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/scan-targets'),
      ])
      const catData = await catRes.json()
      const targetData = await targetRes.json()
      setCategories(catData)
      setScanTargets(targetData)
      if (targetData.length && !selectedTargetId) {
        setSelectedTargetId(targetData[0].id)
      }
    } catch {
      setStatus({ kind: 'error', text: 'No se pudieron cargar las opciones.' })
    } finally {
      setLoadingOptions(false)
    }
  }

  useEffect(() => {
    loadOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleScan() {
    const target = scanTargets.find((t) => t.id === selectedTargetId)
    if (!target) {
      setStatus({ kind: 'error', text: 'Elige una ciudad de la lista.' })
      return
    }
    setScanLoading(true)
    setStatus(null)
    try {
      await triggerWorkflow('scan', {
        city: target.city,
        country: target.country,
        osm_area: target.osm_area,
        category: scanCategory,
      })
      setStatus({ kind: 'success', text: `Radar disparado para ${target.label}. Revisa Actions en GitHub en unos segundos.` })
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
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, active: !c.active } : c)))
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: cat.id, active: !cat.active }),
      })
      if (!response.ok) throw new Error()
    } catch {
      setStatus({ kind: 'error', text: `No se pudo actualizar ${cat.label_es}.` })
      loadOptions()
    }
  }

  async function toggleTarget(target: ScanTarget) {
    setScanTargets((prev) => prev.map((t) => (t.id === target.id ? { ...t, active: !t.active } : t)))
    try {
      const response = await fetch('/api/scan-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: target.id, active: !target.active }),
      })
      if (!response.ok) throw new Error()
    } catch {
      setStatus({ kind: 'error', text: `No se pudo actualizar ${target.label}.` })
      loadOptions()
    }
  }

  async function handleAddTarget() {
    if (!newCity || !newCountry) {
      setStatus({ kind: 'error', text: 'Completa al menos ciudad y país.' })
      return
    }
    setAddingTarget(true)
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
          label: `${newCity}, ${newCountry}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear')
      setStatus({ kind: 'success', text: `Ciudad "${newCity}" agregada.` })
      setNewCity('')
      setNewCountry('')
      setNewOsmArea('')
      setShowAddTarget(false)
      await loadOptions()
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setAddingTarget(false)
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
      setShowAddCategory(false)
      await loadOptions()
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message })
    } finally {
      setAddingCategory(false)
    }
  }

  if (loadingOptions) {
    return <p className="font-mono text-xs text-parchmentDim">Cargando panel...</p>
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

      <Section title="Radar de prospectos" description="Elige una ciudad y un rubro, o deja el rubro en 'todos'">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad">
            <select value={selectedTargetId} onChange={(e) => setSelectedTargetId(e.target.value)}>
              {scanTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                  {!t.active ? ' (pausada)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rubro">
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

        <div className="border-t border-hairline pt-3">
          {!showAddTarget ? (
            <button
              onClick={() => setShowAddTarget(true)}
              className="font-mono text-xs text-parchmentDim underline underline-offset-2 hover:text-brass"
            >
              + agregar otra ciudad
            </button>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Ciudad">
                  <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Miami" />
                </Field>
                <Field label="País (código)">
                  <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="US" />
                </Field>
                <Field label="Área OSM (opcional)">
                  <input
                    value={newOsmArea}
                    onChange={(e) => setNewOsmArea(e.target.value)}
                    placeholder="igual a la ciudad si se deja vacío"
                  />
                </Field>
              </div>
              <div className="flex gap-2">
                <ActionButton onClick={handleAddTarget} loading={addingTarget} label="Guardar ciudad" />
                <button
                  onClick={() => setShowAddTarget(false)}
                  className="font-mono text-xs text-parchmentDim hover:text-parchment"
                >
                  cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {scanTargets.length > 0 && (
          <div className="border-t border-hairline pt-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
              Ciudades guardadas
            </p>
            <div className="flex flex-col gap-2">
              {scanTargets.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-sm border border-hairline px-3 py-2">
                  <p className="text-sm text-parchment">{t.label}</p>
                  <button
                    onClick={() => toggleTarget(t)}
                    className={`rounded-sm px-3 py-1 font-mono text-xs transition-colors ${
                      t.active ? 'bg-signal/20 text-signal' : 'bg-hairline/40 text-parchmentDim'
                    }`}
                  >
                    {t.active ? 'activa' : 'pausada'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
        <div className="flex flex-col gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-sm border border-hairline px-3 py-2">
              <div>
                <p className="text-sm text-parchment">{cat.label_es}</p>
                <p className="font-mono text-[11px] text-parchmentDim">{cat.category_key}</p>
              </div>
              <button
                onClick={() => toggleCategory(cat)}
                className={`rounded-sm px-3 py-1 font-mono text-xs transition-colors ${
                  cat.active ? 'bg-signal/20 text-signal' : 'bg-hairline/40 text-parchmentDim'
                }`}
              >
                {cat.active ? 'activo' : 'pausado'}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-hairline pt-3">
          {!showAddCategory ? (
            <button
              onClick={() => setShowAddCategory(true)}
              className="font-mono text-xs text-parchmentDim underline underline-offset-2 hover:text-brass"
            >
              + agregar rubro nuevo
            </button>
          ) : (
            <div className="space-y-2">
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
              <div className="flex gap-2">
                <ActionButton onClick={handleAddCategory} loading={addingCategory} label="Guardar rubro" />
                <button
                  onClick={() => setShowAddCategory(false)}
                  className="font-mono text-xs text-parchmentDim hover:text-parchment"
                >
                  cancelar
                </button>
              </div>
            </div>
          )}
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
