import { defineEventHandler, getRouterParam, sendRedirect } from 'h3'
import { OPTIMIZED_ASSETS_CDN } from '../../../shared/utils/resolveAsset'

export default defineEventHandler((event) => {
  const assetPath = getRouterParam(event, 'path') ?? ''
  return sendRedirect(event, `${OPTIMIZED_ASSETS_CDN}/${assetPath}`, 302)
})
