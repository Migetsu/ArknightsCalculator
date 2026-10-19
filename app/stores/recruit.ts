import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  RecruitData,
  RecruitOperator,
  RecruitTag,
  RecruitTagGroup,
  RecruitCombinationResult,
} from '~/../shared/schemas/recruit'
import { calculateRecruit } from '~/../shared/utils/recruit'
import recruitDataRaw from '~/../data/recruit.json'

const recruitData = recruitDataRaw as RecruitData

export const MAX_RECRUIT_TAGS = 5

export const useRecruitStore = defineStore('recruit', () => {
  const selectedTags = ref<string[]>([])
  const serverPool = ref<'global' | 'cn'>('global')

  const allTags = computed<RecruitTag[]>(() => recruitData.tags)

  const tagsByGroup = computed<Record<RecruitTagGroup, RecruitTag[]>>(() => {
    const groups: Record<RecruitTagGroup, RecruitTag[]> = {
      qualification: [],
      position: [],
      class: [],
      affix: [],
    }
    for (const tag of recruitData.tags) {
      groups[tag.group].push(tag)
    }
    return groups
  })

  const activePool = computed<RecruitOperator[]>(() => {
    return serverPool.value === 'cn' ? recruitData.pools.cn : recruitData.pools.global
  })

  const combinations = computed<RecruitCombinationResult[]>(() => {
    return calculateRecruit(selectedTags.value, activePool.value)
  })

  function toggleTag(tagName: string): void {
    const idx = selectedTags.value.indexOf(tagName)
    if (idx >= 0) {
      selectedTags.value.splice(idx, 1)
    } else if (selectedTags.value.length < MAX_RECRUIT_TAGS) {
      selectedTags.value.push(tagName)
    }
  }

  function resetTags(): void {
    selectedTags.value = []
  }

  function setSelectedTags(tags: string[]): void {
    selectedTags.value = [...tags]
  }

  function setServerPool(pool: 'global' | 'cn'): void {
    serverPool.value = pool
  }

  function isTagSelected(tagName: string): boolean {
    return selectedTags.value.includes(tagName)
  }

  return {
    selectedTags,
    serverPool,
    allTags,
    tagsByGroup,
    activePool,
    combinations,
    toggleTag,
    resetTags,
    setSelectedTags,
    setServerPool,
    isTagSelected,
  }
})
