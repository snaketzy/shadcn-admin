import { dictionaryGroups } from './schema'

export const groupOptions = dictionaryGroups.map((group) => ({
  label: group,
  value: group,
}))
