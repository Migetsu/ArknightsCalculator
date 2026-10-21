import { createError, defineEventHandler, setHeader } from 'h3'
import { readOperatorDataIdParam, readOperatorHandbook } from '../../utils/operatorData'

export default defineEventHandler(async (event) => {
  const id = readOperatorDataIdParam(event)
  const handbook = await readOperatorHandbook(id)
  if (!handbook) {
    // Missing dossiers are expected for Amiya patch forms (char_1001_amiya2, char_1037_amiya3).
    throw createError({ statusCode: 404, statusMessage: 'Operator dossier not found' })
  }

  setHeader(event, 'cache-control', 'public, max-age=3600')
  return handbook
})
