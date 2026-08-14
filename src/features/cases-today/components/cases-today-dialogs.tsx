import { CasesActionDialog } from '@/features/cases/components/cases-action-dialog'
import { CasesDeleteDialog } from '@/features/cases/components/cases-delete-dialog'
import { CasesRemarkDialog } from '@/features/cases/components/cases-remark-dialog'
import { useCasesToday } from './cases-today-provider'

export function CasesTodayDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useCasesToday()
  return (
    <>
      <CasesActionDialog
        key='case-today-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <CasesActionDialog
            key={`case-today-edit-${currentRow.case_id}`}
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
            key={`case-today-delete-${currentRow.case_id}`}
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
            key={`case-today-remark-${currentRow.case_id}`}
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
