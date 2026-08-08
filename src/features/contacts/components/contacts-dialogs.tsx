import { ContactsActionDialog } from './contacts-action-dialog'
import { ContactsDeleteDialog } from './contacts-delete-dialog'
import { useContacts } from './contacts-provider'

export function ContactsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useContacts()
  return (
    <>
      <ContactsActionDialog
        key='contact-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <ContactsActionDialog
            key={`contact-edit-${currentRow.contact_id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <ContactsDeleteDialog
            key={`contact-delete-${currentRow.contact_id}`}
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
