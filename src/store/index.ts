import { configureStore } from '@reduxjs/toolkit'
import { themeReducer } from './slices/theme-slice'
import { layoutReducer } from './slices/layout-slice'
import { searchReducer } from './slices/search-slice'
import { fontReducer } from './slices/font-slice'
import { directionReducer } from './slices/direction-slice'
import { casesReducer } from './slices/cases-slice'
import { casesDealReducer } from './slices/cases-deal-slice'
import { casesTodayReducer } from './slices/cases-today-slice'
import { contactsReducer } from './slices/contacts-slice'
import { collaborationsReducer } from './slices/collaborations-slice'
import { suppliersReducer } from './slices/suppliers-slice'
import { ownersReducer } from './slices/owners-slice'
import { usersReducer } from './slices/users-slice'
import { dictionariesReducer } from './slices/dictionaries-slice'
import { tasksReducer } from './slices/tasks-slice'
import { contactDetailReducer } from './slices/contact-detail-slice'
import { supplierDetailReducer } from './slices/supplier-detail-slice'

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    layout: layoutReducer,
    search: searchReducer,
    font: fontReducer,
    direction: directionReducer,
    cases: casesReducer,
    casesDeal: casesDealReducer,
    casesToday: casesTodayReducer,
    contacts: contactsReducer,
    collaborations: collaborationsReducer,
    suppliers: suppliersReducer,
    owners: ownersReducer,
    users: usersReducer,
    dictionaries: dictionariesReducer,
    tasks: tasksReducer,
    contactDetail: contactDetailReducer,
    supplierDetail: supplierDetailReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
