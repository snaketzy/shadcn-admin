import { useEffect } from 'react'
import { getCookie } from '@/lib/cookies'
import { useAppDispatch } from '@/store/hooks'
import {
  setCollapsible,
  setVariant,
  type Collapsible,
} from '@/store/slices/ui/layout-slice'

export { useLayout, type Collapsible } from '@/store/slices/ui/layout-slice'

type LayoutProviderProps = {
  children: React.ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const savedCollapsible = getCookie('layout_collapsible') as Collapsible | undefined
    dispatch(setCollapsible(savedCollapsible || 'icon'))

    const savedVariant = getCookie('layout_variant') as 'inset' | 'sidebar' | 'floating' | undefined
    dispatch(setVariant(savedVariant || 'inset'))
  }, [dispatch])

  return <>{children}</>
}
