import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  resetLayout,
  setCollapsible as setCollapsibleAction,
  setVariant as setVariantAction,
  LAYOUT_CONSTANTS,
  type Collapsible,
  type Variant,
} from '@/store/slices/layout-slice'
import { setCookie } from '@/lib/cookies'

const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

type LayoutProviderProps = {
  children: React.ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const dispatch = useAppDispatch()
  const collapsible = useAppSelector((s) => s.layout.collapsible)
  const variant = useAppSelector((s) => s.layout.variant)

  useEffect(() => {
    setCookie(
      LAYOUT_CONSTANTS.LAYOUT_COLLAPSIBLE_COOKIE_NAME,
      collapsible,
      LAYOUT_COOKIE_MAX_AGE
    )
  }, [collapsible])

  useEffect(() => {
    setCookie(
      LAYOUT_CONSTANTS.LAYOUT_VARIANT_COOKIE_NAME,
      variant,
      LAYOUT_COOKIE_MAX_AGE
    )
  }, [variant])

  void dispatch

  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout() {
  const dispatch = useAppDispatch()
  const collapsible = useAppSelector((s) => s.layout.collapsible)
  const variant = useAppSelector((s) => s.layout.variant)
  const defaultCollapsible = useAppSelector((s) => s.layout.defaultCollapsible)
  const defaultVariant = useAppSelector((s) => s.layout.defaultVariant)

  const setCollapsible = (c: Collapsible) => {
    dispatch(setCollapsibleAction(c))
  }
  const setVariant = (v: Variant) => {
    dispatch(setVariantAction(v))
  }
  const reset = () => dispatch(resetLayout())

  return {
    resetLayout: reset,
    defaultCollapsible,
    collapsible,
    setCollapsible,
    defaultVariant,
    variant,
    setVariant,
  }
}
