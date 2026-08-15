import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { SupplierDictEntry } from '@/features/suppliers/api/client'
import type { Supplier } from '@/features/suppliers/data/schema'
import type { Contact } from '@/features/contacts/api/client'

type SupplierDetailState = {
  supplierId: string
  supplier: Supplier | null
  isLoading: boolean
  error: Error | null
  contactRows: Contact[]
  fieldDict: SupplierDictEntry[]
}

const initialState: SupplierDetailState = {
  supplierId: '',
  supplier: null,
  isLoading: false,
  error: null,
  contactRows: [],
  fieldDict: [],
}

const supplierDetailSlice = createSlice({
  name: 'supplierDetail',
  initialState,
  reducers: {
    setSupplierId: (state, action: PayloadAction<string>) => {
      state.supplierId = action.payload
    },
    setSupplier: (state, action: PayloadAction<Supplier | null>) => {
      state.supplier = action.payload
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<Error | null>) => {
      state.error = action.payload
    },
    setContactRows: (state, action: PayloadAction<Contact[]>) => {
      state.contactRows = action.payload
    },
    setFieldDict: (state, action: PayloadAction<SupplierDictEntry[]>) => {
      state.fieldDict = action.payload
    },
    setAll: (
      state,
      action: PayloadAction<{
        supplierId: string
        supplier: Supplier | null
        isLoading: boolean
        error: Error | null
        contactRows: Contact[]
        fieldDict: SupplierDictEntry[]
      }>
    ) => {
      state.supplierId = action.payload.supplierId
      state.supplier = action.payload.supplier
      state.isLoading = action.payload.isLoading
      state.error = action.payload.error
      state.contactRows = action.payload.contactRows
      state.fieldDict = action.payload.fieldDict
    },
    resetSupplierDetail: () => initialState,
  },
})

export const {
  setSupplierId,
  setSupplier,
  setIsLoading,
  setError,
  setContactRows,
  setFieldDict,
  setAll: setSupplierDetailAll,
  resetSupplierDetail,
} = supplierDetailSlice.actions
export const supplierDetailReducer = supplierDetailSlice.reducer
