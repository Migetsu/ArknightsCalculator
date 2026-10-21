import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { buildDataAssetBuckets } from '../../../modules/server-data-assets/build-buckets'
import {
  OPERATOR_DATA_DATASETS,
  bucketIndexForId,
} from '../../../shared/utils/operatorData'
import type { OperatorDataDataset } from '../../../shared/utils/operatorData'

const DATA_DIR = resolve(process.cwd(), 'data')

function datasetOf(name: OperatorDataDataset['name']): OperatorDataDataset {
  const dataset = OPERATOR_DATA_DATASETS.find((entry) => entry.name === name)
  if (!dataset) throw new Error(`Unknown dataset: ${name}`)
  return dataset
}

async function readBucketRecords(
  outDir: string,
  dataset: OperatorDataDataset,
): Promise<Record<string, unknown>> {
  const records: Record<string, unknown> = {}
  for (let index = 0; index < dataset.bucketCount; index++) {
    const raw = await readFile(join(outDir, dataset.name, `${index}.json`), 'utf-8')
    Object.assign(records, JSON.parse(raw) as Record<string, unknown>)
  }
  return records
}

describe('server data asset buckets', () => {
  it('generates buckets from source JSON, skips unchanged sources, and rebuilds on change', async () => {
    const root = await mkdtemp(join(tmpdir(), 'arkcalc-data-assets-'))
    try {
      const dataDir = join(root, 'data')
      const outDir = join(root, 'out')
      await mkdir(join(dataDir, 'operators'), { recursive: true })
      await mkdir(join(dataDir, 'handbook'), { recursive: true })

      await writeFile(
        join(dataDir, 'operators', 'char_002_amiya.json'),
        JSON.stringify({ id: 'char_002_amiya', name: 'Amiya' }),
      )
      await writeFile(
        join(dataDir, 'operators', 'char_003_kalts.json'),
        JSON.stringify({ id: 'char_003_kalts', name: 'Kaltsit' }),
      )
      await writeFile(
        join(dataDir, 'handbook', 'char_002_amiya.json'),
        JSON.stringify({ charId: 'char_002_amiya', stories: [] }),
      )

      const first = await buildDataAssetBuckets({ dataDir, outDir })
      expect(first.skipped).toBe(false)

      const operatorBuckets = await readBucketRecords(outDir, datasetOf('operators'))
      expect(Object.keys(operatorBuckets).sort()).toEqual(['char_002_amiya', 'char_003_kalts'])
      expect(operatorBuckets.char_002_amiya).toMatchObject({ name: 'Amiya' })

      const handbookBuckets = await readBucketRecords(outDir, datasetOf('handbook'))
      expect(Object.keys(handbookBuckets)).toEqual(['char_002_amiya'])

      const second = await buildDataAssetBuckets({ dataDir, outDir })
      expect(second.skipped).toBe(true)

      // A size change is part of the freshness signature, so no mtime sleep is needed.
      await writeFile(
        join(dataDir, 'operators', 'char_003_kalts.json'),
        JSON.stringify({ id: 'char_003_kalts', name: 'Kaltsit', updated: true }),
      )
      const third = await buildDataAssetBuckets({ dataDir, outDir })
      expect(third.skipped).toBe(false)

      const refreshed = await readBucketRecords(outDir, datasetOf('operators'))
      expect(refreshed.char_003_kalts).toMatchObject({ updated: true })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('places every real operator and handbook entry into its bucket', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'arkcalc-real-data-assets-'))
    try {
      await buildDataAssetBuckets({ dataDir: DATA_DIR, outDir })

      const operatorFiles = (await readdir(join(DATA_DIR, 'operators'))).filter((file) =>
        file.endsWith('.json'),
      )
      const handbookFiles = (await readdir(join(DATA_DIR, 'handbook'))).filter((file) =>
        file.endsWith('.json'),
      )
      expect(operatorFiles.length).toBeGreaterThan(400)
      expect(handbookFiles.length).toBeGreaterThan(400)

      const operatorBuckets = await readBucketRecords(outDir, datasetOf('operators'))
      for (const file of operatorFiles) {
        const id = file.slice(0, -'.json'.length)
        expect(operatorBuckets[id], `missing operator ${id}`).toMatchObject({ id })
      }

      const handbookBuckets = await readBucketRecords(outDir, datasetOf('handbook'))
      for (const file of handbookFiles) {
        const id = file.slice(0, -'.json'.length)
        expect(handbookBuckets[id], `missing handbook ${id}`).toMatchObject({ charId: id })
      }

      // Amiya class-change forms have no dossier and must stay absent.
      expect(handbookBuckets.char_1001_amiya2).toBeUndefined()
      expect(handbookBuckets.char_1037_amiya3).toBeUndefined()
      expect(existsSync(join(DATA_DIR, 'handbook', 'char_1001_amiya2.json'))).toBe(false)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  })

  it('keeps hash distribution usable for every configured bucket', async () => {
    const operatorFiles = (await readdir(join(DATA_DIR, 'operators'))).filter((file) =>
      file.endsWith('.json'),
    )
    const counts = new Map<number, number>()
    for (const file of operatorFiles) {
      const id = file.slice(0, -'.json'.length)
      const index = bucketIndexForId(id, datasetOf('operators').bucketCount)
      counts.set(index, (counts.get(index) ?? 0) + 1)
    }
    expect(counts.size).toBe(datasetOf('operators').bucketCount)
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(10)
    }
  })
})
