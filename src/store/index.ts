import { configureStore } from '@reduxjs/toolkit'
import themeReducer from './slices/ui/theme-slice'
import layoutReducer from './slices/ui/layout-slice'
import directionReducer from './slices/ui/direction-slice'
import fontReducer from './slices/ui/font-slice'
import searchReducer from './slices/ui/search-slice'
import casesReducer from './slices/cases/cases-slice'
import casesDealReducer from './slices/cases/cases-deal-slice'
import casesTodayReducer from './slices/cases/cases-today-slice'
import contactsReducer from './slices/contacts-slice'
import collaborationsReducer from './slices/collaborations-slice'
import dictionariesReducer from './slices/dictionaries-slice'
import ownersReducer from './slices/owners-slice'
import suppliersReducer from './slices/suppliers-slice'
import tasksReducer from './slices/tasks-slice'
import usersReducer from './slices/users-slice'

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    layout: layoutReducer,
    direction: directionReducer,
    font: fontReducer,
    search: searchReducer,
    cases: casesReducer,
    casesDeal: casesDealReducer,
    casesToday: casesTodayReducer,
    contacts: contactsReducer,
    collaborations: collaborationsReducer,
    dictionaries: dictionariesReducer,
    owners: ownersReducer,
    suppliers: suppliersReducer,
    tasks: tasksReducer,
    users: usersReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
