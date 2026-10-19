import type { HandbookStory } from '../schemas/handbook'

/**
 * Utilities for parsing and normalizing Arknights operator handbook tables.
 */

export interface ParsedTagField {
  tag: string
  value: string
}

/**
 * Parses structured sections ("Basic Info", "Physical Exam") with [Tag] or 【Tag】 pairs.
 * Crucial edge case handled: value can be on subsequent line(s) if empty after tag.
 */
export function parseTaggedSection(rawText: string): ParsedTagField[] {
  if (!rawText) return []
  const lines = rawText.split(/\r?\n/)
  const result: ParsedTagField[] = []
  let currentTag: string | null = null
  let currentLines: string[] = []

  for (const line of lines) {
    const match = line.match(/^\s*(?:\[([^\]]+)\]|【([^】]+)】)\s*(.*)$/)
    if (match) {
      if (currentTag) {
        result.push({
          tag: currentTag,
          value: currentLines.join('\n').trim(),
        })
      }
      currentTag = (match[1] || match[2])!.trim()
      const sameLineContent = match[3]?.trim()
      currentLines = sameLineContent ? [sameLineContent] : []
    } else {
      if (currentTag) {
        currentLines.push(line.trim())
      }
    }
  }

  if (currentTag) {
    result.push({
      tag: currentTag,
      value: currentLines.join('\n').trim(),
    })
  }

  return result
}

/**
 * Checks if a handbook story title or content is a placeholder/stub (e.g. "？？？", "???", or whitespace).
 */
export function isHandbookStub(title: string, text: string): boolean {
  const isQuestionMarksOnly = (s: string) => /^[\s?？]+$/.test(s.trim())
  if (!text || text.trim().length === 0) return true
  if (isQuestionMarksOnly(title) && (isQuestionMarksOnly(text) || text.trim().length < 10))
    return true
  if (title.trim() === '？？？' || title.trim() === '???') return true
  return false
}

/**
 * Checks if a story has already been recorded based on its title and text content.
 */
export function isDuplicateStory(title: string, text: string, seenStories: Set<string>): boolean {
  const key = `${title.trim()}:::${text.trim()}`
  if (seenStories.has(key)) {
    return true
  }
  seenStories.add(key)
  return false
}

/**
 * Normalizes tag strings (EN and CN) into canonical camelCase property identifiers.
 */
export const TAG_KEY_MAP: Record<string, string> = {
  // Profile (EN)
  'Code Name': 'codeName',
  Codename: 'codeName',
  Name: 'codeName',
  Model: 'model',
  'Serial Number': 'serialNumber',
  Gender: 'gender',
  'Gender Assignment': 'genderAssignment',
  'Combat Experience': 'combatExperience',
  'Time in Service': 'timeInService',
  'Years of Service': 'timeInService',
  'Brawling Experience': 'combatExperience',
  'Competition Knight Experience': 'combatExperience',
  'Prison Brawling Experience': 'combatExperience',
  'Bodyguard Experience': 'combatExperience',
  'Battlefield Cleanup Experience': 'combatExperience',
  'Dungeoneering Experience': 'combatExperience',
  'Thieving Experience': 'combatExperience',
  'Work Experience': 'combatExperience',
  'Guide Experience': 'combatExperience',
  'Famiglia Tenure': 'combatExperience',
  'Engineering Experience': 'combatExperience',
  'Performance Experience': 'combatExperience',
  'Place of Birth': 'placeOfBirth',
  'Place of Production': 'placeOfProduction',
  'Date of Birth': 'dateOfBirth',
  'Date of Release': 'dateOfRelease',
  Race: 'race',
  Manufacturer: 'manufacturer',
  Height: 'height',
  Weight: 'weight',
  'Horn Length': 'hornLength',
  'Tail Length': 'tailLength',
  Horn: 'hornLength',
  Voice: 'voiceType',
  'Infection Status': 'infectionStatus',
  'Originium Infection Condition': 'infectionStatus',
  'Inspection Report': 'inspectionReport',
  'Inspection Results': 'inspectionReport',

  // Profile (CN)
  代号: 'codeName',
  姓名: 'codeName',
  型号: 'model',
  编号: 'serialNumber',
  性别: 'gender',
  设定性别: 'genderAssignment',
  战斗经验: 'combatExperience',
  出厂时间: 'timeInService',
  格斗经验: 'combatExperience',
  斗殴经验: 'combatExperience',
  打架经验: 'combatExperience',
  骑士竞技经验: 'combatExperience',
  狱中斗殴经验: 'combatExperience',
  保镖经验: 'combatExperience',
  直播经验: 'combatExperience',
  特工经验: 'combatExperience',
  打扫战场经验: 'combatExperience',
  迷宫经验: 'combatExperience',
  偷窃经验: 'combatExperience',
  打工经验: 'combatExperience',
  向导经验: 'combatExperience',
  家族活动经验: 'combatExperience',
  工程经验: 'combatExperience',
  表演经验: 'combatExperience',
  入学年级: 'academicGrade',
  出身地: 'placeOfBirth',
  产地: 'placeOfProduction',
  生日: 'dateOfBirth',
  出厂日: 'dateOfRelease',
  种族: 'race',
  制造商: 'manufacturer',
  身高: 'height',
  高度: 'height',
  体重: 'weight',
  重量: 'weight',
  角长度: 'hornLength',
  尾巴长度: 'tailLength',
  角长: 'hornLength',
  语音类型: 'voiceType',
  矿石病感染情况: 'infectionStatus',
  维护检测报告: 'inspectionReport',
  维护检测情况: 'inspectionReport',

  // Physical Exam (EN)
  'Physical Strength': 'physicalStrength',
  Mobility: 'mobility',
  'Physical Resilience': 'physicalResilience',
  'Tactical Acumen': 'tacticalAcumen',
  'Combat Skill': 'combatSkill',
  'Combat Skills': 'combatSkill',
  'Originium Arts Assimilation': 'originiumArtsAssimilation',
  'Originium Arts Assilimation': 'originiumArtsAssimilation',
  'Originium ArtsAssimilation': 'originiumArtsAssimilation',
  'Top Speed': 'topSpeed',
  Climb: 'climb',
  Brake: 'brake',
  Endurance: 'endurance',
  'Structural Integrity': 'structuralIntegrity',
  Footnote: 'footnote',

  // Physical Exam (CN)
  物理强度: 'physicalStrength',
  战场机动: 'mobility',
  生理耐受: 'physicalResilience',
  战术规划: 'tacticalAcumen',
  战斗技巧: 'combatSkill',
  源石技艺适应性: 'originiumArtsAssimilation',
  最高速度: 'topSpeed',
  爬坡能力: 'climb',
  制动效能: 'brake',
  通过性: 'passability',
  续航: 'endurance',
  结构稳定性: 'structuralIntegrity',
  附注: 'footnote',
  '补测记录-11': 'retestRecord',
  学力水平: 'academicLevel',
  身体素质: 'physicalFitness',
  心理健康: 'mentalHealth',
  社会实践: 'socialPractice',
  沟通技巧: 'communicationSkill',
  铳械技艺适应性: 'gunSkillAdaptation',
}

/**
 * Canonical title lookup for structured attributes in English and Chinese.
 */
export const CANONICAL_TITLES: Record<string, { en: string; zh: string }> = {
  codeName: { en: 'Code Name', zh: '代号' },
  model: { en: 'Model', zh: '型号' },
  serialNumber: { en: 'Serial Number', zh: '编号' },
  gender: { en: 'Gender', zh: '性别' },
  genderAssignment: { en: 'Gender Assignment', zh: '设定性别' },
  combatExperience: { en: 'Combat Experience', zh: '战斗经验' },
  timeInService: { en: 'Time in Service', zh: '出厂时间' },
  academicGrade: { en: 'Academic Grade', zh: '入学年级' },
  placeOfBirth: { en: 'Place of Birth', zh: '出身地' },
  placeOfProduction: { en: 'Place of Production', zh: '产地' },
  dateOfBirth: { en: 'Date of Birth', zh: '生日' },
  dateOfRelease: { en: 'Date of Release', zh: '出厂日' },
  race: { en: 'Race', zh: '种族' },
  manufacturer: { en: 'Manufacturer', zh: '制造商' },
  height: { en: 'Height', zh: '身高' },
  weight: { en: 'Weight', zh: '体重' },
  hornLength: { en: 'Horn Length', zh: '角长度' },
  tailLength: { en: 'Tail Length', zh: '尾巴长度' },
  voiceType: { en: 'Voice', zh: '语音类型' },
  infectionStatus: { en: 'Infection Status', zh: '矿石病感染情况' },
  inspectionReport: { en: 'Inspection Report', zh: '维护检测报告' },

  physicalStrength: { en: 'Physical Strength', zh: '物理强度' },
  mobility: { en: 'Mobility', zh: '战场机动' },
  physicalResilience: { en: 'Physical Resilience', zh: '生理耐受' },
  tacticalAcumen: { en: 'Tactical Acumen', zh: '战术规划' },
  combatSkill: { en: 'Combat Skill', zh: '战斗技巧' },
  originiumArtsAssimilation: { en: 'Originium Arts Assimilation', zh: '源石技艺适应性' },

  topSpeed: { en: 'Top Speed', zh: '最高速度' },
  climb: { en: 'Climb', zh: '爬坡能力' },
  brake: { en: 'Brake', zh: '制动效能' },
  passability: { en: 'Passability', zh: '通过性' },
  endurance: { en: 'Endurance', zh: '续航' },
  structuralIntegrity: { en: 'Structural Integrity', zh: '结构稳定性' },
  footnote: { en: 'Footnote', zh: '附注' },
  retestRecord: { en: 'Retest Record', zh: '补测记录-11' },

  academicLevel: { en: 'Academic Level', zh: '学力水平' },
  physicalFitness: { en: 'Physical Fitness', zh: '身体素质' },
  mentalHealth: { en: 'Mental Health', zh: '心理健康' },
  socialPractice: { en: 'Social Practice', zh: '社会实践' },
  communicationSkill: { en: 'Communication Skill', zh: '沟通技巧' },
  gunSkillAdaptation: { en: 'Gun Skill Adaptation', zh: '铳械技艺适应性' },
}

/**
 * Checks whether a story represents an alternate class-conversion form (e.g. Amiya Guard/Medic).
 */
export function isPatchStory(story: HandbookStory): boolean {
  return story.unlockType === 'PATCH' || Boolean(story.patchCharId)
}

/**
 * Known patch form display labels for class conversions.
 */
export const PATCH_FORM_CLASS_LABELS: Record<string, string> = {
  char_1001_amiya2: 'Guard',
  char_1037_amiya3: 'Medic',
}

/**
 * Resolves the class conversion form label for a given patchCharId.
 */
export function getPatchFormLabel(patchCharId?: string | null): string {
  if (!patchCharId) return 'Alternate Form'
  return PATCH_FORM_CLASS_LABELS[patchCharId] || patchCharId
}

/**
 * Canonical story ordering priorities.
 * Lower number = appears earlier in the dossier.
 */
export function getStorySortOrder(story: HandbookStory): number {
  const en = story.storyTitle.en?.trim() || ''
  const zh = story.storyTitle.zh?.trim() || ''

  if (en === 'Basic Info' || zh === '基础档案') return 10
  if (en === 'Profile' || zh === '客观履历' || zh === '学生概况') return 20
  if (en === 'Clinical Analysis' || zh === '临床诊断分析' || zh === '特殊疾病筛查') return 30
  if (en === 'Originium Arts Rating' || zh === '源石技艺评定') return 35
  if (en === 'Archive File 1' || zh === '档案资料一') return 40
  if (en === 'Archive File 2' || zh === '档案资料二') return 50
  if (en === 'Archive File 3' || zh === '档案资料三') return 60
  if (en === 'Archive File 4' || zh === '档案资料四') return 70
  if (en === 'Archive File 5' || zh === '档案资料五') return 80
  if (en === 'Promotion Record' || zh === '晋升记录' || zh === '加密报告') return 90

  // Class conversion records (if sorted together)
  if (en === 'Class Conversion Record 1' || zh === '升变档案一') return 110
  if (en === 'Class Conversion Record 2' || zh === '升变档案二') return 120

  return 100
}

/**
 * Sorts stories into canonical lore order, preserving original relative order for ties.
 */
export function sortHandbookStories(stories: HandbookStory[]): HandbookStory[] {
  return [...stories].sort((a, b) => getStorySortOrder(a) - getStorySortOrder(b))
}

/**
 * Splits stories into standard archival stories (sorted canonically) and class conversion PATCH stories.
 */
export function splitHandbookStories(stories: HandbookStory[]): {
  standardStories: HandbookStory[]
  patchStories: HandbookStory[]
} {
  const standard: HandbookStory[] = []
  const patch: HandbookStory[] = []

  for (const story of stories) {
    if (isPatchStory(story)) {
      patch.push(story)
    } else {
      standard.push(story)
    }
  }

  return {
    standardStories: sortHandbookStories(standard),
    patchStories: sortHandbookStories(patch),
  }
}
