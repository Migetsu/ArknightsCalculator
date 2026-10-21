import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CONFIG_PATH,
  isValidCommitSha,
  updateSourcePins,
} from '../../../scripts/data/update-sources'

const OLD_CN = 'a'.repeat(40)
const OLD_EN = 'b'.repeat(40)
const ASSET_COMMIT = 'c'.repeat(40)
const NEW_COMMIT = 'd'.repeat(40)

const FIXTURE = `export interface DataSourcesConfig {
  sources: {
    cn: { commit: string }
    en: { commit: string }
  }
}

export const DATA_SOURCES_CONFIG = {
  cacheDir: '.cache/raw',
  sources: {
    cn: {
      repo: 'SanityGoneAK/arknights-gamedata',
      branch: 'main',
      commit: '${OLD_CN}',
      locale: 'cn',
      tables: ['character_table.json', 'item_table.json'],
    },
    en: {
      repo: 'SanityGoneAK/arknights-gamedata',
      branch: 'main',
      commit: '${OLD_EN}',
      locale: 'en',
      tables: ['character_table.json', 'item_table.json'],
    },
  },
  assets: {
    repo: 'yuanyan3060/ArknightsGameResource',
    commit: '${ASSET_COMMIT}',
    repositories: {
      primary: { commit: '${ASSET_COMMIT}' },
    },
  },
} as const
`

describe('scripts/data/update-sources', () => {
  describe('isValidCommitSha', () => {
    it('accepts a 40 character lowercase hex sha', () => {
      expect(isValidCommitSha(OLD_CN)).toBe(true)
      expect(isValidCommitSha('0123456789abcdef0123456789abcdef01234567')).toBe(true)
    })

    it('rejects malformed shas', () => {
      expect(isValidCommitSha('')).toBe(false)
      expect(isValidCommitSha('a'.repeat(39))).toBe(false)
      expect(isValidCommitSha('a'.repeat(41))).toBe(false)
      expect(isValidCommitSha('A'.repeat(40))).toBe(false)
      expect(isValidCommitSha('g'.repeat(40))).toBe(false)
      expect(isValidCommitSha('main')).toBe(false)
    })
  })

  describe('updateSourcePins', () => {
    it('replaces both cn and en pins and keeps asset pins untouched', () => {
      const result = updateSourcePins(FIXTURE, NEW_COMMIT)

      expect(result.changed).toBe(true)
      expect(result.previousCommits).toEqual([OLD_CN, OLD_EN])
      expect(result.contents.match(/commit: '[0-9a-f]{40}'/g)).toHaveLength(4)
      expect(result.contents).not.toContain(OLD_CN)
      expect(result.contents).not.toContain(OLD_EN)
      expect(result.contents.match(new RegExp(`commit: '${NEW_COMMIT}'`, 'g'))).toHaveLength(2)
      expect(result.contents.match(new RegExp(`commit: '${ASSET_COMMIT}'`, 'g'))).toHaveLength(2)
    })

    it('is idempotent when the requested commit is already pinned', () => {
      const first = updateSourcePins(FIXTURE, NEW_COMMIT)
      const second = updateSourcePins(first.contents, NEW_COMMIT)

      expect(second.changed).toBe(false)
      expect(second.previousCommits).toEqual([NEW_COMMIT, NEW_COMMIT])
      expect(second.contents).toBe(first.contents)
    })

    it('rejects an invalid commit sha', () => {
      expect(() => updateSourcePins(FIXTURE, 'main')).toThrow(/Invalid commit sha/)
      expect(() => updateSourcePins(FIXTURE, 'A'.repeat(40))).toThrow(/Invalid commit sha/)
      expect(() => updateSourcePins(FIXTURE, NEW_COMMIT)).not.toThrow()
    })

    it('fails when the sources block is missing', () => {
      expect(() => updateSourcePins('export const CONFIG = {}\n', NEW_COMMIT)).toThrow(
        /Could not find a "sources: \{"/,
      )
    })

    it('fails when the sources block does not pin exactly two commits', () => {
      const singleSource = `export const CONFIG = {
  sources: {
    cn: { commit: '${OLD_CN}' },
  },
}
`
      expect(() => updateSourcePins(singleSource, NEW_COMMIT)).toThrow(/exactly 2 pinned commits/)
    })
  })

  describe('real sources config', () => {
    it('updates the two source pins without touching pinned asset commits', () => {
      const configPath = fileURLToPath(new URL(`../../../${CONFIG_PATH}`, import.meta.url))
      const contents = readFileSync(configPath, 'utf-8')
      const assetCommits = contents
        .slice(contents.indexOf('assets: {'))
        .match(/commit: '[0-9a-f]{40}'/g)

      expect(assetCommits).toHaveLength(4)

      const result = updateSourcePins(contents, NEW_COMMIT)

      expect(result.changed).toBe(true)
      expect(result.previousCommits).toHaveLength(2)
      for (const assetCommit of assetCommits ?? []) {
        expect(result.contents).toContain(assetCommit)
      }
      expect(result.contents.match(new RegExp(`commit: '${NEW_COMMIT}'`, 'g'))).toHaveLength(2)
    })
  })
})
