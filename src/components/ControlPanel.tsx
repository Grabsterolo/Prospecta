import { useEffect, useMemo, useState } from 'react'
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

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panamá' },
  { code: 'CO', name: 'Colombia' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'ES', name: 'España' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'EC', name: 'Ecuador' },
]

function countryName(code: string) {
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.name ?? code
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

  // Radar: país → ciudad (filtrada) → rubro, todo por dropdown
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedTargetId, setSelectedTargetId] = useState<string>('')
  const [scanCategory, setScanCategory] = useState('')
  const [scanLoading, setScanLoading] = useState(false)

  // Agregar ciudad nueva (solo cuando de verdad no está en la lista)
  const [showAddTarget, setShowAddTarget] = useState(false)
  const [newCity, setNewCity] = useState('')
  const [newCountry, setNewCountry] = useState(COUNTRY_OPTIONS[0].code)
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

  const availableCountries = useMemo(
    () => Array.from(new Set(scanTargets.map((t) => t.country))).sort(),
    [scanTargets],
  )

  const targetsInCountry = useMemo(
    () => scanTargets.filter((t) => t.country === selectedCountry),
    [scanTargets, selectedCountry],
  )

  async function loadOptions() {
    setLoadingOptions(true)
    try {
      const [catRes, targetRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/scan-targets'),
      ])
      const catData = await catRes.json()
      const targetData: ScanTarget[] = await targetRes.json()
      setCategories(catData)
      setScanTargets(targetData)
      if (targetData.length) {
        const firstCountry = targetData[0].country
        setSelectedCountry((prev) => prev || firstCountry)
        const pool = targetData.filter((t) => t.country === (selectedCountry || firstCountry))
        setSelectedTargetId((prev) => prev || pool[0]?.id || targetData[0].id)
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

  function handleCountryChange(code: string) {
    setSelectedCountry(code)
    const first = scanTargets.find((t) => t.country === code)
    setSelectedTargetId(first ? first.id : '')
  }

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
          label: `${newCity}, ${countryName(newCountry)}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear')
      setStatus({ kind: 'success', text: `Ciudad "${newCity}" agregada.` })
      setNewCity('')
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
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="font-mono text-xs text-parchmentDim">Cargando panel...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      {status && (
        <div
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            status.kind === 'success'
              ? 'border-signal/30 bg-signal/10 text-signal'
              : 'border-alert/30 bg-alert/10 text-alert'
          }`}
        >
          <span className="mt-0.5 text-base leading-none">{status.kind === 'success' ? '✓' : '!'}</span>
          <span>{status.text}</span>
        </div>
      )}

      <Section title="Radar de prospectos" description="Elige país, ciudad y rubro — o deja el rubro en “todos”">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="País">
            <select value={selectedCountry} onChange={(e) => handleCountryChange(e.target.value)}>
              {availableCountries.map((code) => (
                <option key={code} value={code}>
                  {countryName(code)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ciudad">
            <select value={selectedTargetId} onChange={(e) => setSelectedTargetId(e.target.value)}>
              {targetsInCountry.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.city}
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

        {!showAddTarget ? (
          <button
            onClick={() => setShowAddTarget(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-hairline px-3 py-2 font-mono text-xs text-parchmentDim transition-colors hover:border-brass/50 hover:text-brass"
          >
            <span className="text-sm leading-none">+</span> agregar otra ciudad
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-dashed border-hairline/70 bg-ink/30 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="País">
                <select value={newCountry} onChange={(e) => setNewCountry(e.target.value)}>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ciudad">
                <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Miami" />
              </Field>
              <Field label="Área OSM (opcional)">
                <input
                  value={newOsmArea}
                  onChange={(e) => setNewOsmArea(e.target.value)}
                  placeholder="igual a la ciudad si se deja vacío"
                />
              </Field>
            </div>
            <div className="flex items-center gap-3">
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

        {scanTargets.length > 0 && (
          <div className="space-y-2 border-t border-hairline pt-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-parchmentDim">
              Ciudades guardadas
            </p>
            <div className="flex flex-col gap-1.5">
              {scanTargets.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-hairline/50 bg-ink/20 px-3 py-2 transition-colors hover:bg-ink/40"
                >
                  <p className="text-sm text-parchment">
                    {t.label} <span className="text-xs text-parchmentDim">({countryName(t.country)})</span>
                  </p>
                  <TogglePill active={t.active} onClick={() => toggleTarget(t)} onLabel="activa" offLabel="pausada" />
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
        <div className="flex flex-col gap-1.5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-lg border border-hairline/50 bg-ink/20 px-3 py-2 transition-colors hover:bg-ink/40"
            >
              <div>
                <p className="text-sm text-parchment">{cat.label_es}</p>
                <p className="font-mono text-[11px] text-parchmentDim">{cat.category_key}</p>
              </div>
              <TogglePill active={cat.active} onClick={() => toggleCategory(cat)} onLabel="activo" offLabel="pausado" />
            </div>
          ))}
        </div>

        {!showAddCategory ? (
          <button
            onClick={() => setShowAddCategory(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-hairline px-3 py-2 font-mono text-xs text-parchmentDim transition-colors hover:border-brass/50 hover:text-brass"
          >
            <span className="text-sm leading-none">+</span> agregar rubro nuevo
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-dashed border-hairline/70 bg-ink/30 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            <div className="flex items-center gap-3">
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
    <div className="rounded-xl border border-hairline/70 bg-panel p-6 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.7)]">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
        <div>
          <h2 className="font-display text-lg text-parchment">{title}</h2>
          <p className="mt-0.5 text-sm text-parchmentDim">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
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
      className="rounded-lg bg-brass px-4 py-2.5 font-mono text-xs font-medium text-ink shadow-sm transition-all hover:opacity-90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? 'Enviando...' : label}
    </button>
  )
}

function TogglePill({
  active,
  onClick,
  onLabel,
  offLabel,
}: {
  active: boolean
  onClick: () => void
  onLabel: string
  offLabel: string
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs transition-colors ${
        active
          ? 'bg-signal/15 text-signal ring-1 ring-inset ring-signal/30'
          : 'bg-hairline/30 text-parchmentDim ring-1 ring-inset ring-hairline'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-signal' : 'bg-parchmentDim/50'}`} />
      {active ? onLabel : offLabel}
    </button>
  )
}
