import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  type HandbookDataset,
  type OperatorHandbook,
  type HandbookStory,
  type HandbookItem,
  HandbookDatasetSchema,
  OperatorHandbookSchema,
  HandbookProfileSchema,
  HandbookPhysicalExamSchema,
} from '../../shared/schemas/handbook'
import {
  parseTaggedSection,
  isHandbookStub,
  isDuplicateStory,
  TAG_KEY_MAP,
  CANONICAL_TITLES,
} from '../../shared/utils/handbook'
import {
  type I18nLayersContext,
  type I18nLayersTracker,
  createI18nTracker,
  loadI18nLayersContext,
  resolveLayeredI18nString,
} from './i18n-layers'

const CACHE_DIR = path.resolve(process.cwd(), '.cache/raw')
const DATA_DIR = path.resolve(process.cwd(), 'data')
const OPERATORS_DIR = path.join(DATA_DIR, 'operators')
const HANDBOOK_DIR = path.join(DATA_DIR, 'handbook')
const LEGACY_OUTPUT_FILE = path.join(DATA_DIR, 'handbook.json')

interface RawStoryItem {
  storyText?: string
  unLockType?: string
  unLockParam?: string
  unLockString?: string
}

interface RawStoryAudio {
  stories: RawStoryItem[]
  storyTitle: string
  unLockorNot?: boolean
}

interface RawHandbookEntry {
  charID: string
  infoName: string
  isLimited?: boolean
  storyTextAudio: RawStoryAudio[]
  handbookAvgList?: unknown[]
}

interface RawHandbookTable {
  handbookDict: Record<string, RawHandbookEntry>
}

async function loadRawHandbook(locale: 'en' | 'cn'): Promise<RawHandbookTable> {
  const filePath = path.join(CACHE_DIR, locale, 'handbook_info_table.json')
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as RawHandbookTable
  } catch (err) {
    console.warn(`[WARN] Failed to load handbook_info_table.json for locale ${locale}:`, err)
    return { handbookDict: {} }
  }
}

function buildStructuredSection(
  enText: string | undefined,
  cnText: string | undefined,
  charId: string,
  sectionType: 'profile' | 'exam',
  isGlobal: boolean,
  context: I18nLayersContext,
  tracker: I18nLayersTracker,
) {
  const enTags = enText ? parseTaggedSection(enText) : []
  const cnTags = cnText ? parseTaggedSection(cnText) : []

  const enByCanonical = new Map<string, { tag: string; value: string }>()
  for (const t of enTags) {
    const canonicalKey = TAG_KEY_MAP[t.tag] ?? t.tag
    enByCanonical.set(canonicalKey, t)
  }

  const cnByCanonical = new Map<string, { tag: string; value: string }>()
  for (const t of cnTags) {
    const canonicalKey = TAG_KEY_MAP[t.tag] ?? t.tag
    cnByCanonical.set(canonicalKey, t)
  }

  // Combine canonical keys preserving primary order (EN if present, then CN extras)
  const orderedKeys: string[] = []
  const seenKeys = new Set<string>()

  const primaryTags = enTags.length > 0 ? enTags : cnTags
  for (const t of primaryTags) {
    const key = TAG_KEY_MAP[t.tag] ?? t.tag
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      orderedKeys.push(key)
    }
  }

  // Add any CN tags not present in EN (e.g. Skadi's weight)
  for (const t of cnTags) {
    const key = TAG_KEY_MAP[t.tag] ?? t.tag
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      orderedKeys.push(key)
    }
  }

  const resultSection: Record<string, unknown> = {
    allFields: [] as HandbookItem[],
  }

  for (const canonicalKey of orderedKeys) {
    const enEntry = enByCanonical.get(canonicalKey)
    const cnEntry = cnByCanonical.get(canonicalKey)

    const rawEnVal = enEntry?.value ?? null
    const rawCnVal = cnEntry?.value ?? ''

    const canonicalTitle = CANONICAL_TITLES[canonicalKey]
    const enTitle = enEntry?.tag ?? canonicalTitle?.en ?? canonicalKey
    const cnTitle = cnEntry?.tag ?? canonicalTitle?.zh ?? canonicalKey

    const resolvedVal = resolveLayeredI18nString(
      {
        key: `handbook.${charId}.${sectionType}.${canonicalKey}`,
        charId,
        officialEn: rawEnVal,
        zhText: rawCnVal,
        isGlobal,
      },
      context,
      tracker,
    )

    const resolvedTitle = resolveLayeredI18nString(
      {
        key: `handbook.${charId}.${sectionType}.${canonicalKey}.title`,
        charId,
        officialEn: enTitle,
        zhText: cnTitle,
        isGlobal,
      },
      context,
      tracker,
    )

    resultSection[canonicalKey] = resolvedVal

    resultSection.allFields.push({
      key: canonicalKey,
      title: resolvedTitle,
      value: resolvedVal,
    })
  }

  return resultSection
}

export async function buildHandbook(): Promise<{
  totalOperators: number
  enCovered: number
  cnCovered: number
  cnOnlyCovered: number
  duplicatesDropped: number
  stubsDropped: number
  dataset: HandbookDataset
}> {
  console.log('=== Building Operator Handbooks (data/handbook.json) ===\n')

  const [enTable, cnTable, context, opFiles] = await Promise.all([
    loadRawHandbook('en'),
    loadRawHandbook('cn'),
    loadI18nLayersContext(),
    fs.readdir(OPERATORS_DIR),
  ])

  const tracker = createI18nTracker()
  const dataset: HandbookDataset = {}

  let enCovered = 0
  let cnCovered = 0
  let cnOnlyCovered = 0
  let duplicatesDropped = 0
  let stubsDropped = 0

  // Filter operator IDs from data/operators/*.json and sort deterministically
  const opIds = opFiles
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  for (const charId of opIds) {
    const enOp = enTable.handbookDict[charId]
    const cnOp = cnTable.handbookDict[charId]

    if (!enOp && !cnOp) {
      // Operator has no handbook entry in handbook_info_table.json (e.g. char_1001_amiya2, char_1037_amiya3)
      continue
    }

    const isGlobal = !!enOp
    if (enOp) enCovered++
    if (cnOp) cnCovered++
    if (cnOp && !enOp) cnOnlyCovered++

    // Determine primary Basic Info & Physical Exam stories
    const enStories = enOp?.storyTextAudio ?? []
    const cnStories = cnOp?.storyTextAudio ?? []

    const primaryBasicIndexEn = enStories.findIndex((s) => s.storyTitle === 'Basic Info')
    const primaryBasicIndexCn = cnStories.findIndex(
      (s) => s.storyTitle === '基础档案' || s.storyTitle === '学生概况',
    )
    const primaryBasicIndex = primaryBasicIndexEn >= 0 ? primaryBasicIndexEn : primaryBasicIndexCn

    const primaryExamIndexEn = enStories.findIndex(
      (s) => s.storyTitle === 'Physical Exam' || s.storyTitle === 'Performance Review',
    )
    const primaryExamIndexCn = cnStories.findIndex(
      (s) =>
        s.storyTitle === '综合体检测试' ||
        s.storyTitle === '综合性能检测结果' ||
        s.storyTitle === '综合能力测试',
    )
    const primaryExamIndex = primaryExamIndexEn >= 0 ? primaryExamIndexEn : primaryExamIndexCn

    const basicTextEn =
      primaryBasicIndexEn >= 0 ? enStories[primaryBasicIndexEn]?.stories[0]?.storyText : undefined
    const basicTextCn =
      primaryBasicIndexCn >= 0 ? cnStories[primaryBasicIndexCn]?.stories[0]?.storyText : undefined

    const examTextEn =
      primaryExamIndexEn >= 0 ? enStories[primaryExamIndexEn]?.stories[0]?.storyText : undefined
    const examTextCn =
      primaryExamIndexCn >= 0 ? cnStories[primaryExamIndexCn]?.stories[0]?.storyText : undefined

    const profile = buildStructuredSection(
      basicTextEn,
      basicTextCn,
      charId,
      'profile',
      isGlobal,
      context,
      tracker,
    )

    const physicalExam = buildStructuredSection(
      examTextEn,
      examTextCn,
      charId,
      'exam',
      isGlobal,
      context,
      tracker,
    )

    // Parse stories
    const seenStories = new Set<string>()

    // Pre-record primary basic info and physical exam so duplicates are caught
    if (basicTextEn) seenStories.add(`Basic Info:::${basicTextEn.trim()}`)
    if (basicTextCn) seenStories.add(`基础档案:::${basicTextCn.trim()}`)
    if (examTextEn) {
      const enExamTitle = enStories[primaryExamIndexEn]?.storyTitle ?? 'Physical Exam'
      seenStories.add(`${enExamTitle}:::${examTextEn.trim()}`)
    }
    if (examTextCn) {
      const cnExamTitle = cnStories[primaryExamIndexCn]?.storyTitle ?? '综合体检测试'
      seenStories.add(`${cnExamTitle}:::${examTextCn.trim()}`)
    }

    const stories: HandbookStory[] = []
    const storyCount = Math.max(enStories.length, cnStories.length)

    for (let i = 0; i < storyCount; i++) {
      if (i === primaryBasicIndex || i === primaryExamIndex) {
        // Already parsed into profile / physicalExam
        continue
      }

      const enStory = enStories[i]
      const cnStory = cnStories[i]

      const enTitle = enStory?.storyTitle ?? null
      const cnTitle = cnStory?.storyTitle ?? ''
      const enText = enStory?.stories[0]?.storyText ?? null
      const cnText = cnStory?.stories[0]?.storyText ?? ''

      const checkTitle = enTitle || cnTitle
      const checkText = enText || cnText

      if (isHandbookStub(checkTitle, checkText)) {
        stubsDropped++
        continue
      }

      if (isDuplicateStory(checkTitle, checkText, seenStories)) {
        duplicatesDropped++
        continue
      }

      const unLockType = enStory?.stories[0]?.unLockType ?? cnStory?.stories[0]?.unLockType
      const unLockParam = enStory?.stories[0]?.unLockParam ?? cnStory?.stories[0]?.unLockParam

      const resolvedTitle = resolveLayeredI18nString(
        {
          key: `handbook.${charId}.story.${i}.title`,
          charId,
          officialEn: enTitle,
          zhText: cnTitle,
          isGlobal,
        },
        context,
        tracker,
      )

      const resolvedText = resolveLayeredI18nString(
        {
          key: `handbook.${charId}.story.${i}.text`,
          charId,
          officialEn: enText,
          zhText: cnText,
          isGlobal,
        },
        context,
        tracker,
      )

      const storyItem: HandbookStory = {
        storyTitle: resolvedTitle,
        text: resolvedText,
        unlockType: unLockType || undefined,
        unlockParam: unLockParam || undefined,
        patchCharId: unLockType === 'PATCH' ? unLockParam || undefined : undefined,
      }

      stories.push(storyItem)
    }

    const rawInfoNameEn = enOp?.infoName ?? null
    const rawInfoNameCn = cnOp?.infoName ?? ''

    const resolvedInfoName = resolveLayeredI18nString(
      {
        key: `handbook.${charId}.infoName`,
        charId,
        officialEn: rawInfoNameEn,
        zhText: rawInfoNameCn,
        isGlobal,
      },
      context,
      tracker,
    )

    const parsedProfile = HandbookProfileSchema.parse(profile)
    const parsedExam = HandbookPhysicalExamSchema.parse(physicalExam)

    const opHandbook: OperatorHandbook = {
      charId,
      infoName: resolvedInfoName,
      profile: parsedProfile,
      physicalExam: parsedExam,
      stories,
    }

    // Validate single entry schema
    OperatorHandbookSchema.parse(opHandbook)
    dataset[charId] = opHandbook
  }

  // Validate full dataset schema
  HandbookDatasetSchema.parse(dataset)

  // Ensure target handbook directory exists
  await fs.mkdir(HANDBOOK_DIR, { recursive: true })

  // Remove legacy monolithic handbook.json if present
  try {
    await fs.unlink(LEGACY_OUTPUT_FILE)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err
    }
  }

  // Write each operator handbook as an individual JSON file
  let totalBytes = 0
  let minBytes = Number.POSITIVE_INFINITY
  let maxBytes = 0
  let minOp = ''
  let maxOp = ''

  for (const [charId, opHandbook] of Object.entries(dataset)) {
    const opFilePath = path.join(HANDBOOK_DIR, `${charId}.json`)
    const content = JSON.stringify(opHandbook, null, 2) + '\n'
    await fs.writeFile(opFilePath, content, 'utf-8')

    const size = Buffer.byteLength(content, 'utf-8')
    totalBytes += size
    if (size < minBytes) {
      minBytes = size
      minOp = charId
    }
    if (size > maxBytes) {
      maxBytes = size
      maxOp = charId
    }
  }

  // Clean up any stale files in data/handbook/
  const existingFiles = await fs.readdir(HANDBOOK_DIR)
  for (const file of existingFiles) {
    if (file.endsWith('.json')) {
      const opId = file.replace('.json', '')
      if (!dataset[opId]) {
        await fs.unlink(path.join(HANDBOOK_DIR, file))
      }
    }
  }

  const opCount = Object.keys(dataset).length
  const avgBytes = opCount > 0 ? totalBytes / opCount : 0

  console.log(`[OK] Successfully wrote ${opCount} files to data/handbook/`)
  console.log(`     Total operators covered: ${opCount}`)
  console.log(`     Covered in EN:           ${enCovered}`)
  console.log(`     Covered in CN:           ${cnCovered}`)
  console.log(`     CN-only covered:         ${cnOnlyCovered}`)
  console.log(`     Duplicates dropped:      ${duplicatesDropped}`)
  console.log(`     Stubs dropped:           ${stubsDropped}`)
  console.log(`     Total dataset size:      ${(totalBytes / 1024 / 1024).toFixed(2)} MB (${totalBytes} bytes)`)
  console.log(`     File size min:           ${(minBytes / 1024).toFixed(2)} KB (${minOp})`)
  console.log(`     File size avg:           ${(avgBytes / 1024).toFixed(2)} KB`)
  console.log(`     File size max:           ${(maxBytes / 1024).toFixed(2)} KB (${maxOp})`)

  return {
    totalOperators: opCount,
    enCovered,
    cnCovered,
    cnOnlyCovered,
    duplicatesDropped,
    stubsDropped,
    totalBytes,
    minBytes,
    avgBytes,
    maxBytes,
    dataset,
  }
}

if (process.argv[1]?.includes('build-handbook')) {
  buildHandbook().catch((err: unknown) => {
    console.error('Fatal error during buildHandbook:', err)
    process.exit(1)
  })
}
