export type CustomerRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  taxId: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerDetail = CustomerRow

export type CustomerListFilters = {
  q?: string
  status?: "all" | "active" | "inactive"
}

export type CreateCustomerInput = {
  name: string
  email?: string | null
  phone?: string | null
  taxId?: string | null
  notes?: string | null
  isActive?: boolean
}

export type UpdateCustomerInput = CreateCustomerInput

export type CustomerOption = {
  id: string
  name: string
  isActive: boolean
}
