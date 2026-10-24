import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { readBannerDetail } from '../../../utils/gachaBanners'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid banner ID' })
  }

  setHeader(event, 'cache-control', 'public, max-age=3600')
  return readBannerDetail(id)
})
