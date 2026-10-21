import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { isValidOperatorDataId } from '../../../shared/utils/operatorData'
import { readOperatorSkins } from '../../utils/skins'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!isValidOperatorDataId(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid operator id' })
  }

  setHeader(event, 'cache-control', 'public, max-age=3600')
  // Unknown operators are a normal empty state, not a 404: the detail page
  // renders the same empty skins panel as before the API move.
  return readOperatorSkins(id)
})
