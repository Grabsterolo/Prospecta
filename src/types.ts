export type SuggestedOffer = 'sitio_web' | 'dashboard' | 'asistente_ia' | 'automatizacion' | null

export type OutreachStatus =
  | 'nuevo'
  | 'contactado'
  | 'respondio'
  | 'propuesta_enviada'
  | 'cerrado'
  | 'descartado'

export interface Prospect {
  id: string
  name: string | null
  category: string | null
  country: string | null
  city: string | null
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
  specialty: string | null
  created_at: string
}

export interface ProspectWithScore extends Prospect {
  score_total: number | null
  suggested_offer: SuggestedOffer
  status: OutreachStatus
}

export interface TargetCategory {
  id: string
  category_key: string
  label_es: string
  label_en: string
  active: boolean
  priority: number
}
