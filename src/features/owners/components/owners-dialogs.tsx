import { OwnersActionDialog } from './owners-action-dialog'
import { OwnersDeleteDialog } from './owners-delete-dialog'
import { useOwners } from './owners-provider'

export function OwnersDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useOwners()
  return (
    <>
      <OwnersActionDialog
        key='owner-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <OwnersActionDialog
            key={`owner-edit-${currentRow.owner_id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <OwnersDeleteDialog
            key={`owner-delete-${currentRow.owner_id}`}
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
