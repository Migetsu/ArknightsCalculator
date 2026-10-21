import { createError, defineEventHandler, setHeader } from 'h3'
import { readOperatorDataIdParam, readOperatorDetail } from '../../utils/operatorData'

export default defineEventHandler(async (event) => {
  const id = readOperatorDataIdParam(event)
  const detail = await readOperatorDetail(id)
  if (!detail) {
    throw createError({ statusCode: 404, statusMessage: 'Operator not found' })
  }

  setHeader(event, 'cache-control', 'public, max-age=3600')
  return detail
})
