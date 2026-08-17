import { CasesActionDialog } from '@/features/cases/components/cases-action-dialog'
import { CasesDeleteDialog } from '@/features/cases/components/cases-delete-dialog'
import { CasesMemoDialog } from '@/features/cases/components/cases-memo-dialog'
import { useCasesToday } from './cases-today-provider'

export function CasesTodayDialogs() {
  const {
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    editingMemo,
    setEditingMemo,
  } = useCasesToday()
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

          <CasesMemoDialog
            key={`case-today-memo-${currentRow.case_id}`}
            open={open === 'memo'}
            onOpenChange={(v) => {
              if (!v) {
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
        </>
      )}
    </>
  )
}
