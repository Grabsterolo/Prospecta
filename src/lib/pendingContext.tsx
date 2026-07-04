import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react'

export interface PendingItem {
  id: string
  name: string | null
  city: string | null
  category?: string | null
}

interface PendingContextValue {
  pendingAudit: PendingItem[]
  pendingScore: PendingItem[]
  addPendingAudit: (items: PendingItem[]) => void
  removePendingAudit: (id: string) => void
  addPendingScore: (items: PendingItem[]) => void
  removePendingScore: (id: string) => void
}

const PendingContext = createContext<PendingContextValue | null>(null)

export function PendingProvider({ children }: { children: ReactNode }) {
  const [pendingAudit, setPendingAudit] = useState<PendingItem[]>([])
  const [pendingScore, setPendingScore] = useState<PendingItem[]>([])

  const addPendingAudit = useCallback((items: PendingItem[]) => {
    setPendingAudit((prev) => {
      const existing = new Set(prev.map((p) => p.id))
      return [...prev, ...items.filter((i) => !existing.has(i.id))]
    })
  }, [])

  const removePendingAudit = useCallback((id: string) => {
    setPendingAudit((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const addPendingScore = useCallback((items: PendingItem[]) => {
    setPendingScore((prev) => {
      const existing = new Set(prev.map((p) => p.id))
      return [...prev, ...items.filter((i) => !existing.has(i.id))]
    })
  }, [])

  const removePendingScore = useCallback((id: string) => {
    setPendingScore((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const value = useMemo(
    () => ({ pendingAudit, pendingScore, addPendingAudit, removePendingAudit, addPendingScore, removePendingScore }),
    [pendingAudit, pendingScore, addPendingAudit, removePendingAudit, addPendingScore, removePendingScore],
  )

  return <PendingContext.Provider value={value}>{children}</PendingContext.Provider>
}

export function usePending() {
  const ctx = useContext(PendingContext)
  if (!ctx) throw new Error('usePending debe usarse dentro de PendingProvider')
  return ctx
}
