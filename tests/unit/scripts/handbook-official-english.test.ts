import { describe, expect, it } from 'vitest'
import { toOfficialEnglish } from '../../../scripts/data/build-handbook'
import {
  createEmptyI18nLayersContext,
  resolveLayeredI18nString,
} from '../../../scripts/data/i18n-layers'

/**
 * Regression for the data cron: a CN-only handbook section used to pass its
 * Chinese tag as `officialEn`, so raw Chinese reached the `en` field and
 * `data:validate` failed the whole update.
 */
describe('toOfficialEnglish', () => {
  it('drops a Chinese tag and keeps real Latin text', () => {
    expect(toOfficialEnglish('驮兽接触经验')).toBeNull()
    expect(toOfficialEnglish('  Physical Exam  ')).toBe('Physical Exam')
    expect(toOfficialEnglish(null)).toBeNull()
    expect(toOfficialEnglish('')).toBeNull()
  })

  it('resolves a CN-only profile title to the pending marker, not raw Chinese', () => {
    const resolved = resolveLayeredI18nString(
      {
        key: 'handbook.char_4170_hdbell.profile.驮兽接触经验.title',
        charId: 'char_4170_hdbell',
        officialEn: toOfficialEnglish('驮兽接触经验'),
        zhText: '驮兽接触经验',
      },
      createEmptyI18nLayersContext(),
    )

    expect(resolved.en).toBe('[Pending Translation]')
    expect(resolved.source).toBe('pending')
    expect(resolved.zh).toBe('驮兽接触经验')
  })
})
