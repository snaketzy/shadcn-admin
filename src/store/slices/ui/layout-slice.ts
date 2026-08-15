import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type Collapsible = 'offcanvas' | 'icon' | 'none'
type Variant = 'inset' | 'sidebar' | 'floating'

interface LayoutState {
  collapsible: Collapsible
  variant: Variant
  defaultCollapsible: Collapsible
  defaultVariant: Variant
}

const initialState: LayoutState = {
  collapsible: 'icon',
  variant: 'inset',
  defaultCollapsible: 'icon',
  defaultVariant: 'inset',
}

const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    setCollapsible: (state, action: PayloadAction<Collapsible>) => {
      state.collapsible = action.payload
    },
    setVariant: (state, action: PayloadAction<Variant>) => {
      state.variant = action.payload
    },
    resetLayout: (state) => {
      state.collapsible = state.defaultCollapsible
      state.variant = state.defaultVariant
    },
  },
})

export const { setCollapsible, setVariant, resetLayout } = layoutSlice.actions
export default layoutSlice.reducer

import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCookie } from '@/lib/cookies'

const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export const useLayout = () => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((s) => s.layout)
  return {
    collapsible: state.collapsible,
    defaultCollapsible: state.defaultCollapsible,
    variant: state.variant,
    defaultVariant: state.defaultVariant,
    setCollapsible: (c: Collapsible) => {
      setCookie('layout_collapsible', c, LAYOUT_COOKIE_MAX_AGE)
      dispatch(setCollapsible(c))
    },
    setVariant: (v: Variant) => {
      setCookie('layout_variant', v, LAYOUT_COOKIE_MAX_AGE)
      dispatch(setVariant(v))
    },
    resetLayout: () => dispatch(resetLayout()),
  }
}
