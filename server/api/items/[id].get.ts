import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { readItem } from '../../utils/itemData'
import { isValidItemId } from '../../../shared/utils/itemData'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!isValidItemId(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid item id' })
  }

  const item = await readItem(id)
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Item not found' })
  }

  setHeader(event, 'cache-control', 'public, max-age=86400, stale-while-revalidate=3600')
  return item
})
