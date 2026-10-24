import { defineEventHandler, getQuery, setHeader } from 'h3'
import { readFarmingData } from '../../utils/farmingData'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const server = query.server === 'cn' ? 'cn' : 'global'

  setHeader(event, 'cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
  return readFarmingData(server)
})
