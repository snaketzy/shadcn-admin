import { DictionariesActionDialog } from './dictionaries-action-dialog'
import { DictionariesDeleteDialog } from './dictionaries-delete-dialog'
import { useDictionaries } from './dictionaries-provider'

export function DictionariesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useDictionaries()
  return (
    <>
      <DictionariesActionDialog
        key='dictionary-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <DictionariesActionDialog
            key={`dictionary-edit-${currentRow.dict_id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <DictionariesDeleteDialog
            key={`dictionary-delete-${currentRow.dict_id}`}
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
