import { CollaborationsActionDialog } from './collaborations-action-dialog'
import { CollaborationsDeleteDialog } from './collaborations-delete-dialog'
import { useCollaborations } from './collaborations-provider'

export function CollaborationsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useCollaborations()
  return (
    <>
      <CollaborationsActionDialog
        key='collaboration-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <CollaborationsActionDialog
            key={`collaboration-edit-${currentRow.collaboration_id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <CollaborationsDeleteDialog
            key={`collaboration-delete-${currentRow.collaboration_id}`}
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
