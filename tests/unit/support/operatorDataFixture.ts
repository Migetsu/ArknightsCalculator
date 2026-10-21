import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const API_PATH_PATTERN = /^\/api\/(operators|handbook)\/([a-zA-Z0-9_]+)$/

/**
 * Test double for the Nitro data endpoints. Reads the same JSON files the
 * server generator consumes, so component/composable tests keep exercising real
 * game data after the switch from dynamic imports to the HTTP API.
 */
export async function readOperatorDataFixture(url: string): Promise<unknown> {
  const match = API_PATH_PATTERN.exec(url)
  const dataset = match?.[1]
  const id = match?.[2]
  if (!dataset || !id) {
    throw new Error(`Unexpected operator data request: ${url}`)
  }

  const filePath = resolve(process.cwd(), 'data', dataset, `${id}.json`)
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as unknown
}
