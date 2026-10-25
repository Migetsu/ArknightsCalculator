import { describe, expect, it } from 'vitest'
import {
  collectUntranslatedFromHandbook,
  type RawHandbookTable,
  type RawHandbookTables,
} from '../../../scripts/data/translate-missing'

describe('Translate Missing: Handbook Dossier Collection (pure in-memory)', () => {
  it('collects pending handbook strings and deduplicates identical Chinese values', () => {
    const rawCn: RawHandbookTable = {
      handbookDict: {
        char_4217_makoto: {
          charID: 'char_4217_makoto',
          infoName: '结城理',
          storyTextAudio: [
            {
              stories: [
                {
                  storyText:
                    '【代号】结城理\n【性别】男\n【战斗经验】两年\n【出身地】极东\n【生日】未知\n【种族】未公开\n【身高】170cm\n【矿石病感染情况】\n体表未见源石结晶，暂判定为非感染者。',
                  unLockType: 0,
                  unLockParam: '',
                },
              ],
              storyTitle: '基础档案',
            },
            {
              stories: [
                {
                  storyText:
                    '【物理强度】普通\n【战场机动】标准\n【生理耐受】普通\n【战术规划】标准\n【战斗技巧】优良\n【源石技艺适应性】缺失',
                  unLockType: 1,
                  unLockParam: '1',
                },
              ],
              storyTitle: '综合体检测试',
            },
            {
              stories: [
                {
                  storyText: '这是第一段档案故事。有关影时间与特别课外活动部。',
                  unLockType: 1,
                  unLockParam: '1',
                },
              ],
              storyTitle: '临床诊断分析',
            },
          ],
        },
        char_4218_aigis: {
          charID: 'char_4218_aigis',
          infoName: '埃癸斯',
          storyTextAudio: [
            {
              stories: [
                {
                  storyText: '【代号】埃癸斯\n【性别】女性形态\n【物理强度】卓越',
                  unLockType: 0,
                  unLockParam: '',
                },
              ],
              storyTitle: '基础档案',
            },
            {
              stories: [
                {
                  storyText: '【物理强度】卓越\n【战场机动】标准',
                  unLockType: 1,
                  unLockParam: '1',
                },
              ],
              storyTitle: '综合体检测试',
            },
          ],
        },
      },
    }

    const tables: RawHandbookTables = {
      cn: rawCn,
      en: undefined, // CN-only operators, no EN handbook table
    }

    const items = collectUntranslatedFromHandbook(tables, {
      charNames: {
        char_4217_makoto: '结城理',
        char_4218_aigis: '埃癸斯',
      },
    })

    // Check presence of types
    const profileItems = items.filter((i) => i.type === 'handbook_profile')
    const examItems = items.filter((i) => i.type === 'handbook_exam')
    const storyTitleItems = items.filter((i) => i.type === 'handbook_story_title')
    const storyTextItems = items.filter((i) => i.type === 'handbook_story_text')
    const infoNameItems = items.filter((i) => i.type === 'handbook_info_name')

    expect(profileItems.length).toBeGreaterThan(0)
    expect(examItems.length).toBeGreaterThan(0)
    expect(storyTitleItems.length).toBeGreaterThan(0)
    expect(storyTextItems.length).toBeGreaterThan(0)
    expect(infoNameItems.length).toBe(2)

    // Check deduplication of "标准" (Standard) across makoto and aigis in exams
    const standardExamItem = examItems.find((i) => i.zh === '标准')
    expect(standardExamItem).toBeDefined()
    expect(standardExamItem?.keys).toContain('handbook.char_4217_makoto.exam.mobility')
    expect(standardExamItem?.keys).toContain('handbook.char_4218_aigis.exam.mobility')

    // Check story title and story text
    const storyTitleItem = storyTitleItems.find((i) => i.zh === '临床诊断分析')
    expect(storyTitleItem).toBeDefined()
    expect(storyTitleItem?.keys).toContain('handbook.char_4217_makoto.story.2.title')

    const storyTextItem = storyTextItems.find((i) =>
      i.zh.includes('有关影时间与特别课外活动部'),
    )
    expect(storyTextItem).toBeDefined()
    expect(storyTextItem?.keys).toContain('handbook.char_4217_makoto.story.2.text')
  })

  it('skips keys that are already present in existingKeys', () => {
    const rawCn: RawHandbookTable = {
      handbookDict: {
        char_4217_makoto: {
          charID: 'char_4217_makoto',
          infoName: '结城理',
          storyTextAudio: [
            {
              stories: [
                {
                  storyText: '【代号】结城理\n【性别】男',
                  unLockType: 0,
                  unLockParam: '',
                },
              ],
              storyTitle: '基础档案',
            },
          ],
        },
      },
    }

    const tables: RawHandbookTables = { cn: rawCn }
    const existingKeys = new Set([
      'handbook.char_4217_makoto.profile.codeName',
      'handbook.char_4217_makoto.profile.gender',
      'handbook.char_4217_makoto.infoName',
    ])

    const items = collectUntranslatedFromHandbook(tables, { existingKeys })
    expect(items.length).toBe(0)
  })

  it('skips operators that already have complete EN handbook entries', () => {
    const rawCn: RawHandbookTable = {
      handbookDict: {
        char_002_amiya: {
          charID: 'char_002_amiya',
          infoName: '阿米娅',
          storyTextAudio: [
            {
              stories: [{ storyText: '【代号】阿米娅\n【性别】女', unLockType: 0, unLockParam: '' }],
              storyTitle: '基础档案',
            },
          ],
        },
      },
    }
    const rawEn: RawHandbookTable = {
      handbookDict: {
        char_002_amiya: {
          charID: 'char_002_amiya',
          infoName: 'Amiya',
          storyTextAudio: [
            {
              stories: [{ storyText: '【Code Name】 Amiya\n【Gender】 Female', unLockType: 0, unLockParam: '' }],
              storyTitle: 'Basic Info',
            },
          ],
        },
      },
    }

    const items = collectUntranslatedFromHandbook({ cn: rawCn, en: rawEn })
    expect(items.length).toBe(0)
  })
})
