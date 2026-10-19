<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkSegmented from '~/components/ui/AkSegmented.vue'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import { getModuleById } from '~/config/modules'
import { useRecruitStore, MAX_RECRUIT_TAGS } from '~/stores/recruit'
import { parseRecruitTagsQuery } from '~/../shared/utils/recruit'
import type { GuaranteeTier, RecruitTagGroup } from '~/../shared/schemas/recruit'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const recruitStore = useRecruitStore()
const moduleConfig = getModuleById('recruit')

const poolOptions = [
  { label: t('recruit.poolGlobal'), value: 'global' },
  { label: t('recruit.poolCn'), value: 'cn' },
]

const tagGroupOrder: RecruitTagGroup[] = ['qualification', 'position', 'class', 'affix']

const combinations = computed(() => recruitStore.combinations)
const selectedCount = computed(() => recruitStore.selectedTags.length)

const queryTruncated = ref(false)
const appliedQueryTags = ref<string[]>([])

function applyTagsFromQuery() {
  const queryTags = route.query.tags
  if (!queryTags) {
    queryTruncated.value = false
    appliedQueryTags.value = []
    return
  }

  const result = parseRecruitTagsQuery(queryTags, MAX_RECRUIT_TAGS)
  queryTruncated.value = result.isTruncated
  appliedQueryTags.value = result.appliedTags
  recruitStore.setSelectedTags(result.appliedTags)
}

watch(
  () => route.query.tags,
  () => {
    applyTagsFromQuery()
  },
  { immediate: true },
)

function handleResetTags() {
  recruitStore.resetTags()
  queryTruncated.value = false
}

function getTierBadgeClass(tier: GuaranteeTier): string {
  return `recruit-page__tier-badge--${tier}`
}

function getTierCardClass(tier: GuaranteeTier): string {
  return `recruit-page__combo-card--${tier}`
}

function getRarityStars(rarity: number): string {
  return '★'.repeat(rarity)
}

function asAvatarRarity(rarity: number): 1 | 2 | 3 | 4 | 5 | 6 {
  return rarity as 1 | 2 | 3 | 4 | 5 | 6
}
</script>

<template>
  <div class="recruit-page">
    <AkContainer size="lg" class="recruit-page__container">
      <AkPageHeader
        :code="moduleConfig?.code ?? 'RCR-03'"
        :tag-label="t('modules.tag')"
        :title="t('recruit.title')"
        :subtitle="t('recruit.subtitle')"
        watermark="RECRUIT"
        :badge="t('modules.status.ready')"
        badge-variant="green"
      />

      <AkAlert
        v-if="queryTruncated"
        variant="warning"
        :title="t('recruit.queryTruncatedTitle')"
        class="recruit-page__alert"
      >
        {{
          t('recruit.queryTruncatedWarning', {
            max: MAX_RECRUIT_TAGS,
            applied: appliedQueryTags.join(', '),
          })
        }}
      </AkAlert>

      <div class="recruit-page__layout">
        <!-- Selector Panel (Left) -->
        <aside class="recruit-page__selector-panel">
          <div class="recruit-page__panel-header">
            <h2 class="recruit-page__panel-title">{{ t('recruit.title') }}</h2>
            <AkSegmented v-model="recruitStore.serverPool" :options="poolOptions" size="sm" />
          </div>

          <div class="recruit-page__counter-bar">
            <span class="recruit-page__counter-label">
              {{ t('recruit.selectLimit', { max: MAX_RECRUIT_TAGS }) }}
            </span>
            <span class="recruit-page__counter-value">
              {{ t('recruit.selectedCount', { count: selectedCount, max: MAX_RECRUIT_TAGS }) }}
            </span>
          </div>

          <div class="recruit-page__groups">
            <div v-for="groupKey in tagGroupOrder" :key="groupKey" class="recruit-page__group">
              <h3 class="recruit-page__group-title">
                {{ t(`recruit.groups.${groupKey}`) }}
              </h3>
              <div class="recruit-page__tag-grid" :class="`recruit-page__tag-grid--${groupKey}`">
                <button
                  v-for="tag in recruitStore.tagsByGroup[groupKey]"
                  :key="tag.id"
                  type="button"
                  class="recruit-page__tag-btn"
                  :class="{ 'recruit-page__tag-btn--active': recruitStore.isTagSelected(tag.name) }"
                  @click="recruitStore.toggleTag(tag.name)"
                >
                  {{ t(`recruit.tags.${tag.name}`) }}
                </button>
              </div>
            </div>
          </div>

          <div class="recruit-page__actions">
            <button
              type="button"
              class="recruit-page__reset-btn"
              :disabled="selectedCount === 0"
              @click="handleResetTags"
            >
              {{ t('recruit.resetTags') }}
            </button>
          </div>
        </aside>

        <!-- Results Panel (Right) -->
        <section class="recruit-page__results-panel">
          <div class="recruit-page__results-header">
            <h2 class="recruit-page__results-title">
              {{ t('recruit.combinationsTitle') }}
            </h2>
            <span v-if="combinations.length > 0" class="recruit-page__results-count">
              {{ t('recruit.combinationsCount', { count: combinations.length }) }}
            </span>
          </div>

          <!-- Empty: No tags selected -->
          <div v-if="selectedCount === 0" class="recruit-page__state-box">
            <AkEmptyState
              :title="t('recruit.empty.title')"
              :description="t('recruit.empty.description')"
            />
          </div>

          <!-- Empty: Tags selected, but 0 matches -->
          <div v-else-if="combinations.length === 0" class="recruit-page__state-box">
            <AkEmptyState
              :title="t('recruit.noMatches.title')"
              :description="t('recruit.noMatches.description')"
            />
          </div>

          <!-- List of combinations -->
          <div v-else class="recruit-page__combo-list">
            <div class="recruit-page__timer-notice">
              <span class="recruit-page__notice-icon">ℹ</span>
              <span class="recruit-page__notice-text">
                {{ t('recruit.timerNotice') }}
              </span>
            </div>

            <article
              v-for="combo in combinations"
              :key="combo.tags.join('+')"
              class="recruit-page__combo-card"
              :class="getTierCardClass(combo.guaranteeTier)"
            >
              <header class="recruit-page__combo-header">
                <span
                  class="recruit-page__tier-badge"
                  :class="getTierBadgeClass(combo.guaranteeTier)"
                >
                  {{ t(`recruit.tiers.${combo.guaranteeTier}`) }}
                </span>
                <div class="recruit-page__combo-tags">
                  <span v-for="tag in combo.tags" :key="tag" class="recruit-page__combo-tag-pill">
                    {{ t(`recruit.tags.${tag}`) }}
                  </span>
                </div>
              </header>

              <div class="recruit-page__operators-grid">
                <NuxtLink
                  v-for="op in combo.operators"
                  :key="op.id"
                  :to="localePath(`/operators/${op.id}`)"
                  class="recruit-page__op-chip"
                  :class="`recruit-page__op-chip--rarity-${op.rarity}`"
                  :title="`${op.name.en} (${getRarityStars(op.rarity)})`"
                >
                  <div class="recruit-page__op-avatar-wrap">
                    <AkAvatar
                      :id="op.id"
                      :name="op.name.en"
                      :rarity="asAvatarRarity(op.rarity)"
                      :size="44"
                    />
                  </div>
                  <div class="recruit-page__op-info">
                    <span class="recruit-page__op-name">{{ op.name.en }}</span>
                    <span
                      class="recruit-page__op-rarity"
                      :class="`recruit-page__op-rarity--${op.rarity}`"
                    >
                      {{ getRarityStars(op.rarity) }}
                    </span>
                  </div>
                </NuxtLink>
              </div>
            </article>
          </div>
        </section>
      </div>
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.recruit-page {
  padding-top: var(--space-md);
  padding-bottom: var(--space-2xl);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  @include mq(md) {
    padding-top: var(--space-xl);
  }

  &__container {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    min-width: 0;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(320px, 420px) 1fr;
    gap: 24px;
    align-items: start;
    min-width: 0;

    @media (width <= 960px) {
      grid-template-columns: 1fr;
    }
  }

  &__selector-panel {
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
    box-sizing: border-box;

    @media (width <= 480px) {
      padding: 16px;
      gap: 14px;
    }
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
  }

  &__counter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: 12px;
  }

  &__counter-label {
    font-weight: var(--font-weight-medium);
  }

  &__counter-value {
    font-family: var(--font-mono);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-accent);
  }

  &__groups {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__group-title {
    margin: 0;
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__tag-grid {
    display: grid;
    gap: 6px;

    &--qualification {
      grid-template-columns: repeat(3, 1fr);
    }

    &--position {
      grid-template-columns: repeat(2, 1fr);
    }

    &--class {
      grid-template-columns: repeat(4, 1fr);

      @media (width <= 480px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    &--affix {
      grid-template-columns: repeat(3, 1fr);

      @media (width <= 480px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  }

  &__tag-btn {
    padding: 9px 8px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-bold);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
      background-color var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-primary);
      color: var(--color-text-accent);
    }

    &--active {
      background-color: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-text-inverse);

      &:hover {
        background-color: var(--color-accent-primary-hover);
        color: var(--color-text-inverse);
      }
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-start;
    padding-top: 6px;
  }

  &__reset-btn {
    padding: 8px 16px;
    background-color: transparent;
    border: 1px solid var(--color-border-gold);
    color: var(--color-text-accent);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: background-color var(--transition-fast);

    @include focus-ring;

    &:hover:not(:disabled) {
      background-color: var(--color-bg-highlight);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &__results-panel {
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    display: flex;
    flex-direction: column;
    min-width: 0;
    box-sizing: border-box;
  }

  &__results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-border-subtle);

    @media (width <= 480px) {
      padding: 14px 16px;
    }
  }

  &__results-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  &__results-count {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__state-box {
    padding: 40px 20px;
  }

  &__combo-list {
    display: flex;
    flex-direction: column;
  }

  &__timer-notice {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 24px;
    background-color: rgb(255 106 61 / 6%);
    border-bottom: 1px solid var(--color-border-subtle);
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--color-text-secondary);

    @media (width <= 480px) {
      padding: 10px 14px;
      font-size: 11px;
    }
  }

  &__notice-icon {
    color: var(--color-accent-primary);
    font-weight: var(--font-weight-bold);
  }

  &__notice-text {
    flex: 1;
    min-width: 0;
  }

  &__combo-card {
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-border-subtle);
    display: flex;
    flex-direction: column;
    gap: 14px;

    @media (width <= 480px) {
      padding: 16px 14px;
      gap: 10px;
    }

    &:last-child {
      border-bottom: 0;
    }

    &--6_star {
      border-left: 3px solid var(--color-rarity-6);
    }

    &--5_star {
      border-left: 3px solid var(--color-rarity-5);
    }

    &--4_star {
      border-left: 3px solid var(--color-rarity-4);
    }

    &--robot {
      border-left: 3px solid #5ccfe6;
    }

    &--3_star_plus {
      border-left: 3px solid var(--color-border-bold);
    }

    &--starter {
      border-left: 3px solid var(--color-rarity-2);
    }
  }

  &__combo-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__tier-badge {
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-caption);
    padding: 4px 8px;
    text-transform: uppercase;

    &--6_star {
      background-color: rgb(255 157 43 / 15%);
      color: var(--color-rarity-6);
      border: 1px solid var(--color-rarity-6);
    }

    &--5_star {
      background-color: rgb(255 213 79 / 15%);
      color: var(--color-rarity-5);
      border: 1px solid var(--color-rarity-5);
    }

    &--4_star {
      background-color: rgb(155 107 214 / 15%);
      color: var(--color-rarity-4);
      border: 1px solid var(--color-rarity-4);
    }

    &--robot {
      background-color: rgb(92 207 230 / 15%);
      color: #5ccfe6;
      border: 1px solid #5ccfe6;
    }

    &--starter {
      background-color: rgb(127 196 138 / 15%);
      color: var(--color-rarity-2);
      border: 1px solid var(--color-rarity-2);
    }

    &--3_star_plus {
      background-color: rgb(232 221 211 / 6%);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-bold);
    }
  }

  &__combo-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__combo-tag-pill {
    padding: 3px 8px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-bold);
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-accent);
  }

  &__operators-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    @media (width <= 480px) {
      gap: 8px;
    }
  }

  &__op-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px 6px 6px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-bold);
    text-decoration: none;
    color: var(--color-text-primary);
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-primary);
      background-color: var(--color-bg-elevated);
    }

    &--rarity-6 {
      border-bottom: 2px solid var(--color-rarity-6);
    }

    &--rarity-5 {
      border-bottom: 2px solid var(--color-rarity-5);
    }

    &--rarity-4 {
      border-bottom: 2px solid var(--color-rarity-4);
    }

    &--rarity-3 {
      border-bottom: 2px solid var(--color-rarity-3);
    }

    &--rarity-2 {
      border-bottom: 2px solid var(--color-rarity-2);
    }

    &--rarity-1 {
      border-bottom: 2px solid #5ccfe6;
    }
  }

  &__op-avatar-wrap {
    flex-shrink: 0;
  }

  &__op-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__op-name {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 110px;
  }

  &__op-rarity {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: -0.05em;

    &--6 {
      color: var(--color-rarity-6);
    }

    &--5 {
      color: var(--color-rarity-5);
    }

    &--4 {
      color: var(--color-rarity-4);
    }

    &--3 {
      color: var(--color-rarity-3);
    }

    &--2 {
      color: var(--color-rarity-2);
    }

    &--1 {
      color: #5ccfe6;
    }
  }
}
</style>
