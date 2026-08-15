import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { getCookie } from '@/lib/cookies'

export type Collapsible = 'offcanvas' | 'icon' | 'none'
export type Variant = 'inset' | 'sidebar' | 'floating'

const LAYOUT_COLLAPSIBLE_COOKIE_NAME = 'layout_collapsible'
const LAYOUT_VARIANT_COOKIE_NAME = 'layout_variant'
const DEFAULT_VARIANT = 'inset'
const DEFAULT_COLLAPSIBLE = 'icon'

type LayoutState = {
  defaultCollapsible: Collapsible
  collapsible: Collapsible
  defaultVariant: Variant
  variant: Variant
}

const initialState: LayoutState = {
  defaultCollapsible: DEFAULT_COLLAPSIBLE,
  collapsible:
    ((getCookie(LAYOUT_COLLAPSIBLE_COOKIE_NAME) as Collapsible) ||
      DEFAULT_COLLAPSIBLE),
  defaultVariant: DEFAULT_VARIANT,
  variant:
    ((getCookie(LAYOUT_VARIANT_COOKIE_NAME) as Variant) || DEFAULT_VARIANT),
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
      state.collapsible = DEFAULT_COLLAPSIBLE
      state.variant = DEFAULT_VARIANT
    },
  },
})

export const { setCollapsible, setVariant, resetLayout } = layoutSlice.actions
export const layoutReducer = layoutSlice.reducer
export const LAYOUT_CONSTANTS = {
  LAYOUT_COLLAPSIBLE_COOKIE_NAME,
  LAYOUT_VARIANT_COOKIE_NAME,
  DEFAULT_COLLAPSIBLE,
  DEFAULT_VARIANT,
}
