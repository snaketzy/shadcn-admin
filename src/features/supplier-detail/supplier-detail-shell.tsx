import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { SidebarNav } from '@/features/settings/components/sidebar-nav'
import type { JSX } from 'react'

export type SupplierDetailShellProps = {
  supplierId: string
  title: string
  subTitle?: string
  sidebarItems: { href: string; title: string; icon: JSX.Element }[]
  children: React.ReactNode
}

export function SupplierDetailShell({
  supplierId,
  title,
  subTitle,
  sidebarItems,
  children,
}: SupplierDetailShellProps) {
  const navigate = useNavigate()

  return (
    <>
      <Header>
        <div className='flex items-center gap-2 me-auto'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1'
            onClick={() =>
              navigate({
                to: '/supplier_list',
              })
            }
          >
            <ArrowLeftIcon className='size-4' />
            返回
          </Button>
          <Separator orientation='vertical' className='mx-1 h-6' />
          <Link
            to='/supplier_list'
            className='text-sm font-medium text-muted-foreground hover:underline'
          >
            供应商列表
          </Link>
          <span className='text-muted-foreground/60 text-xs'>/</span>
          <span className='text-sm font-medium truncate max-w-48'>
            {title}
          </span>
        </div>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed>
        <div className='space-y-0.5 flex-none'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl truncate max-w-full'>
            {title}
            <span className='ml-3 text-sm font-normal text-muted-foreground'>
              ID：{supplierId}
            </span>
          </h1>
          <p className='text-muted-foreground'>
            {subTitle ?? '查看并管理该供应商的基础信息与业务信息。'}
          </p>
        </div>
        <Separator className='my-4 lg:my-6 flex-none' />
        <div className='flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarItems} />
          </aside>
          <div className='flex min-h-0 flex-1 w-full overflow-hidden p-1'>
            {children}
          </div>
        </div>
      </Main>
    </>
  )
}
