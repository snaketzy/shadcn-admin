import { CasesActionDialog } from '@/features/cases/components/cases-action-dialog'
import { CasesDeleteDialog } from '@/features/cases/components/cases-delete-dialog'
import { CasesRemarkDialog } from '@/features/cases/components/cases-remark-dialog'
import { useCasesDeal } from './cases-deal-provider'

export function CasesDealDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useCasesDeal()
  return (
    <>
      <CasesActionDialog
        key='case-deal-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <CasesActionDialog
            key={`case-deal-edit-${currentRow.case_id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <CasesDeleteDialog
            key={`case-deal-delete-${currentRow.case_id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <CasesRemarkDialog
            key={`case-deal-remark-${currentRow.case_id}`}
            open={open === 'remark'}
            onOpenChange={() => {
              setOpen('remark')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
