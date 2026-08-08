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
        onOpenChange={(s) => {
          if (s) setOpen('add')
          else setOpen(null)
        }}
      />

      {currentRow && (
        <>
          <ContactsActionDialog
            key={`contact-edit-${currentRow.contact_id}`}
            open={open === 'edit'}
            onOpenChange={(s) => {
              if (s) setOpen('edit')
              else {
                setCurrentRow(null)
                setOpen(null)
              }
            }}
            currentRow={currentRow}
          />

          <ContactsDeleteDialog
            key={`contact-delete-${currentRow.contact_id}`}
            open={open === 'delete'}
            onOpenChange={(s) => {
              if (s) setOpen('delete')
              else {
                setCurrentRow(null)
                setOpen(null)
              }
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
