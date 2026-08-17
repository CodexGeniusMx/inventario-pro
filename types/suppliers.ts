export type SupplierRow = {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  taxId: string | null
  paymentTerms: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SupplierDetail = SupplierRow

export type SupplierListFilters = {
  q?: string
  status?: "all" | "active" | "inactive"
}

export type CreateSupplierInput = {
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  taxId?: string | null
  paymentTerms?: string | null
  notes?: string | null
  isActive?: boolean
}

export type UpdateSupplierInput = CreateSupplierInput

export type SupplierOption = {
  id: string
  name: string
  isActive: boolean
}
