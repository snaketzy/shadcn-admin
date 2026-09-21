import { CasesActionDialog } from '@/features/cases/components/cases-action-dialog'
import { CasesDeleteDialog } from '@/features/cases/components/cases-delete-dialog'
import { CasesMemoDialog } from '@/features/cases/components/cases-memo-dialog'
import { useCasesUrgent } from './cases-urgent-provider'

export function CasesUrgentDialogs() {
  const {
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    editingMemo,
    setEditingMemo,
  } = useCasesUrgent()
  return (
    <>
      <CasesActionDialog
        key='case-urgent-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <CasesActionDialog
            key={`case-urgent-edit-${currentRow.case_id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <CasesMemoDialog
            key={`case-urgent-memo-${currentRow.case_id}`}
            open={open === 'memo'}
            onOpenChange={(o) => {
              if (!o) {
                setEditingMemo(null)
                setTimeout(() => {
                  setCurrentRow(null)
                }, 500)
              }
              setOpen('memo')
            }}
            currentRow={currentRow}
            editingMemo={editingMemo}
            onEditingMemoChange={setEditingMemo}
          />

          <CasesDeleteDialog
            key={`case-urgent-delete-${currentRow.case_id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
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
