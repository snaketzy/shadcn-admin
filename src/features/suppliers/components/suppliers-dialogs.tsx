import { SuppliersActionDialog } from './suppliers-action-dialog'
import { SuppliersDeleteDialog } from './suppliers-delete-dialog'
import { useSuppliers } from './suppliers-provider'

export function SuppliersDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useSuppliers()
  return (
    <>
      <SuppliersActionDialog
        key='supplier-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <SuppliersActionDialog
            key={`supplier-edit-${currentRow.supplier_id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <SuppliersDeleteDialog
            key={`supplier-delete-${currentRow.supplier_id}`}
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
