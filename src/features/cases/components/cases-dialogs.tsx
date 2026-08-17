import { CasesActionDialog } from './cases-action-dialog'
import { CasesDeleteDialog } from './cases-delete-dialog'
import { CasesMemoDialog } from './cases-memo-dialog'
import { useCases } from './cases-provider'

export function CasesDialogs() {
  const {
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    editingMemo,
    setEditingMemo,
  } = useCases()
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

          <CasesMemoDialog
            key={`case-memo-${currentRow.case_id}`}
            open={open === 'memo'}
            onOpenChange={(o) => {
              if (!o) {
                setOpen(null)
                setEditingMemo(null)
                setTimeout(() => {
                  setCurrentRow(null)
                }, 500)
              } else {
                setOpen('memo')
              }
            }}
            currentRow={currentRow}
            editingMemo={editingMemo}
            onEditingMemoChange={(m) => setEditingMemo(m)}
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
        </>
      )}
    </>
  )
}
