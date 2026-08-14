import { CasesActionDialog } from './cases-action-dialog'
import { CasesDeleteDialog } from './cases-delete-dialog'
import { CasesRemarkDialog } from './cases-remark-dialog'
import { useCases } from './cases-provider'

export function CasesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useCases()
  return (
    <>
      <CasesActionDialog
        key='case-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <CasesActionDialog
            key={`case-edit-${currentRow.case_id}`}
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
            key={`case-delete-${currentRow.case_id}`}
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
            key={`case-remark-${currentRow.case_id}`}
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
