import { useMemo } from 'react'
import { ContentSection } from '@/features/settings/components/content-section'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSupplierDetail } from '../supplier-detail-route'
import { getBadgeColor } from '@/features/suppliers/data/data'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'

type FieldValueProps = {
  label: string
  children: React.ReactNode
}

function FieldValue({ label, children }: FieldValueProps) {
  return (
    <div className='grid grid-cols-6 items-start gap-4 py-3'>
      <div className='col-span-2 pt-0.5 text-sm text-muted-foreground text-end'>
        {label}
      </div>
      <div className='col-span-4 text-sm break-words'>{children}</div>
    </div>
  )
}

export function SupplierDetailBasic() {
  const { supplier, supplierId, contactNameMap, contactMap } = useSupplierDetail()

  const contactBlock = useMemo(() => {
    if (!supplier || supplier.supplier_contact_id == null) return null
    const idStr = String(supplier.supplier_contact_id)
    const name = contactNameMap.get(idStr)
    const c = contactMap.get(idStr)
    return {
      id: idStr,
      name,
      mobile: c?.contact_mobile ?? null,
      email: c?.contact_email ?? null,
      rank: c?.contact_rank ?? null,
    }
  }, [supplier, contactNameMap, contactMap])

  if (!supplier) return null

  return (
    <ContentSection
      title='基本信息'
      desc='该供应商的基础档案信息，包括名称、简称、联系人和地址等。'
    >
      <div className='space-y-4'>
        <Card>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <CardTitle className='text-base'>基础档案</CardTitle>
                <CardDescription>名称、简称、地址等基础字段</CardDescription>
              </div>
              <Link
                to='/supplier_detail/$supplierId/info'
                params={{ supplierId }}
                className='flex items-center gap-1 text-xs text-muted-foreground hover:underline'
              >
                查看业务信息
                <ArrowRightIcon className='size-3' />
              </Link>
            </div>
          </CardHeader>
          <CardContent className='divide-y border-t'>
            <FieldValue label='供应商名称'>
              <span className='font-medium'>{supplier.supplier_name || '-'}</span>
            </FieldValue>
            <FieldValue label='供应商简称'>
              {supplier.supplier_shortname ? (
                <Badge
                  variant='outline'
                  className={cn(getBadgeColor(supplier.supplier_shortname))}
                >
                  {supplier.supplier_shortname}
                </Badge>
              ) : (
                <span className='text-muted-foreground'>-</span>
              )}
            </FieldValue>
            <FieldValue label='供应商ID'>
              <span className='font-mono text-muted-foreground'>
                {supplier.supplier_id}
              </span>
            </FieldValue>
            <FieldValue label='供应商地址'>
              <div className='whitespace-pre-wrap leading-relaxed'>
                {supplier.supplier_address || (
                  <span className='text-muted-foreground'>-</span>
                )}
              </div>
            </FieldValue>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>联系人信息</CardTitle>
            <CardDescription>
              对应的联系人档案（从联系人列表中选择）
            </CardDescription>
          </CardHeader>
          <CardContent className='divide-y border-t'>
            {contactBlock ? (
              <>
                <FieldValue label='联系人'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>
                      {contactBlock.name || `联系人 ID: ${contactBlock.id}`}
                    </span>
                    <Badge variant='outline' className='font-mono text-xs'>
                      ID: {contactBlock.id}
                    </Badge>
                    {contactBlock.rank && (
                      <Badge variant='secondary'>{contactBlock.rank}</Badge>
                    )}
                  </div>
                </FieldValue>
                <FieldValue label='联系人手机'>
                  {contactBlock.mobile ? (
                    <a
                      href={`tel:${contactBlock.mobile}`}
                      className='hover:underline font-mono text-sm'
                    >
                      {contactBlock.mobile}
                    </a>
                  ) : (
                    <span className='text-muted-foreground'>-</span>
                  )}
                </FieldValue>
                <FieldValue label='联系人邮箱'>
                  {contactBlock.email ? (
                    <a
                      href={`mailto:${contactBlock.email}`}
                      className='hover:underline break-all'
                    >
                      {contactBlock.email}
                    </a>
                  ) : (
                    <span className='text-muted-foreground'>-</span>
                  )}
                </FieldValue>
                <FieldValue label='操作'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8'
                    disabled={!contactBlock.id}
                    onClick={() => {
                      if (!contactBlock.id) return
                      const w = window.open(
                        `/contact_list?contactId=${encodeURIComponent(contactBlock.id)}`,
                        '_blank'
                      )
                      if (w) w.focus()
                    }}
                  >
                    打开联系人档案
                  </Button>
                </FieldValue>
              </>
            ) : (
              <div className='py-6 text-center text-sm text-muted-foreground'>
                该供应商暂未关联联系人，可在供应商列表中「编辑」关联。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
