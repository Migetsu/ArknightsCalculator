import { describe, expect, it } from 'vitest'
import { rewriteCommitPin } from '../../../scripts/data/bump-asset-pins'

const source = `export const ASSET_REPO_COMMIT = '9bf239661e37766fba585806fb9fa67e79bb679e'
export const FEXLI_REPO_COMMIT = 'd7bdc0146f99f6fa88ecdc1bbf79021c012c21c5'
`

describe('rewriteCommitPin', () => {
  it('replaces only the requested commit pin', () => {
    const next = rewriteCommitPin(
      source,
      'ASSET_REPO_COMMIT',
      '50032de7650ba1a9ab11de53d50ea567f8df25f0',
    )

    expect(next).toContain("export const ASSET_REPO_COMMIT = '50032de7650ba1a9ab11de53d50ea567f8df25f0'")
    expect(next).toContain("export const FEXLI_REPO_COMMIT = 'd7bdc0146f99f6fa88ecdc1bbf79021c012c21c5'")
  })

  it('throws when the constant is missing instead of silently doing nothing', () => {
    expect(() => rewriteCommitPin(source, 'MISSING_COMMIT', 'a'.repeat(40))).toThrow(
      /MISSING_COMMIT/,
    )
  })
})
