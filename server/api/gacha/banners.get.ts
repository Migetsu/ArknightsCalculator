import { defineEventHandler, setHeader } from 'h3'
import { readGachaPageData } from '../../utils/gachaBanners'

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return readGachaPageData()
})
