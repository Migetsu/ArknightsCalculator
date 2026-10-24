import { defineEventHandler, getQuery, setHeader } from 'h3'
import { readGachaPageData } from '../../utils/gachaBanners'
import type { ServerRegion } from '../../../shared/schemas/operator'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const server: ServerRegion =
    (query.server as string | undefined)?.toLowerCase() === 'cn' ? 'cn' : 'global'

  setHeader(event, 'cache-control', 'public, max-age=3600')
  return readGachaPageData(server)
})
