<script setup lang="ts">
import type { HandbookItem, HandbookStory } from '~~/shared/schemas/handbook'
import type { I18nSource } from '~~/shared/schemas/operator'
import {
  resolveI18nString,
  isPendingTranslation,
  isMachineTranslated,
} from '~~/shared/schemas/operator'
import { splitHandbookStories, getPatchFormLabel } from '~~/shared/utils/handbook'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'

interface Props {
  charId: string
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

const { data: handbook, status } = await useOperatorHandbook(toRef(props, 'charId'))

// Story accordion state: map of expanded state by story index
const expandedStandardStories = ref<Set<number>>(new Set([0]))
const expandedPatchStories = ref<Set<number>>(new Set([0]))

function toggleStandardStory(idx: number): void {
  if (expandedStandardStories.value.has(idx)) {
    expandedStandardStories.value.delete(idx)
  } else {
    expandedStandardStories.value.add(idx)
  }
}

function togglePatchStory(idx: number): void {
  if (expandedPatchStories.value.has(idx)) {
    expandedPatchStories.value.delete(idx)
  } else {
    expandedPatchStories.value.add(idx)
  }
}

const storiesData = computed(() => {
  if (!handbook.value?.stories) {
    return { standardStories: [], patchStories: [] }
  }
  return splitHandbookStories(handbook.value.stories)
})

function formatUnlockCondition(story: HandbookStory): string {
  if (story.unlockType === 'DIRECT') {
    return t('operators.detail.dossier.unlockDirect')
  }
  if (story.unlockType === 'FAVOR' && story.unlockParam) {
    return t('operators.detail.dossier.unlockFavor', { param: story.unlockParam })
  }
  if (story.unlockType === 'AWAKE' && story.unlockParam) {
    const parts = story.unlockParam.split(';')
    const elite = parts[0] || '1'
    const level = parts[1] || '1'
    return t('operators.detail.dossier.unlockAwake', { elite, level })
  }
  if (story.unlockType === 'PATCH') {
    return t('operators.detail.dossier.unlockPatch')
  }
  return ''
}

function hasTranslationFlag(item: HandbookItem | HandbookStory): boolean {
  if ('value' in item) {
    return (
      item.value.source === 'pending' ||
      item.value.source === 'community' ||
      isMachineTranslated(item.value) ||
      isPendingTranslation(item.value)
    )
  }
  return (
    item.storyTitle.source === 'pending' ||
    item.text.source === 'pending' ||
    isMachineTranslated(item.text) ||
    isPendingTranslation(item.text)
  )
}

function getTranslationSource(item: HandbookItem | HandbookStory): I18nSource | undefined {
  if ('value' in item) {
    return item.value.source
  }
  return item.storyTitle.source || item.text.source
}
</script>

<template>
  <!-- Skeleton Loading State -->
  <div v-if="status === 'pending'" class="ak-operator-dossier-panel__loading" aria-busy="true">
    <div class="ak-operator-dossier-panel__skeleton-card" />
    <div class="ak-operator-dossier-panel__skeleton-card" />
    <div class="ak-operator-dossier-panel__skeleton-card" />
  </div>

  <!-- Loaded Dossier Panel (clean empty handling: renders nothing if handbook is null) -->
  <section v-else-if="handbook" class="ak-operator-dossier-panel" aria-label="Operator Dossier">
    <!-- Section 1: Basic Profile -->
    <div
      v-if="handbook.profile.allFields?.length"
      class="ak-operator-dossier-panel__section"
      data-testid="dossier-profile-section"
    >
      <header class="ak-operator-dossier-panel__section-header">
        <span class="ak-operator-dossier-panel__tag">
          {{ t('operators.detail.dossier.basicProfileTag') }}
        </span>
        <h3 class="ak-operator-dossier-panel__section-title">
          {{ t('operators.detail.dossier.basicProfileTitle') }}
        </h3>
      </header>

      <div class="ak-operator-dossier-panel__grid ak-operator-dossier-panel__grid--profile">
        <div
          v-for="field in handbook.profile.allFields"
          :key="field.key"
          class="ak-operator-dossier-panel__item"
          :class="{
            'ak-operator-dossier-panel__item--full':
              field.key === 'infectionStatus' || field.key === 'inspectionReport',
          }"
        >
          <div class="ak-operator-dossier-panel__item-header">
            <span class="ak-operator-dossier-panel__label">
              {{ resolveI18nString(field.title, locale as 'en' | 'zh') || field.key }}
            </span>
            <AkTranslationBadge
              v-if="hasTranslationFlag(field)"
              :source="getTranslationSource(field)"
              :stale="field.value.stale"
            />
          </div>
          <span
            class="ak-operator-dossier-panel__value"
            :class="{
              'ak-operator-dossier-panel__value--pending':
                field.value.source === 'pending' || isPendingTranslation(field.value),
            }"
          >
            {{ resolveI18nString(field.value, locale as 'en' | 'zh') || '—' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Section 2: Physical Evaluation -->
    <div
      v-if="handbook.physicalExam.allFields?.length"
      class="ak-operator-dossier-panel__section"
      data-testid="dossier-physical-section"
    >
      <header class="ak-operator-dossier-panel__section-header">
        <span class="ak-operator-dossier-panel__tag">
          {{ t('operators.detail.dossier.physicalExamTag') }}
        </span>
        <h3 class="ak-operator-dossier-panel__section-title">
          {{ t('operators.detail.dossier.physicalExamTitle') }}
        </h3>
      </header>

      <div class="ak-operator-dossier-panel__grid ak-operator-dossier-panel__grid--exam">
        <div
          v-for="exam in handbook.physicalExam.allFields"
          :key="exam.key"
          class="ak-operator-dossier-panel__exam-card"
        >
          <div class="ak-operator-dossier-panel__exam-header">
            <span class="ak-operator-dossier-panel__exam-title">
              {{ resolveI18nString(exam.title, locale as 'en' | 'zh') || exam.key }}
            </span>
            <AkTranslationBadge
              v-if="hasTranslationFlag(exam)"
              :source="getTranslationSource(exam)"
              :stale="exam.value.stale"
            />
          </div>
          <div class="ak-operator-dossier-panel__exam-rating-wrap">
            <span
              class="ak-operator-dossier-panel__exam-rating"
              :class="{
                'ak-operator-dossier-panel__exam-rating--pending':
                  exam.value.source === 'pending' || isPendingTranslation(exam.value),
              }"
            >
              {{ resolveI18nString(exam.value, locale as 'en' | 'zh') || '—' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Archival Stories -->
    <div
      v-if="storiesData.standardStories.length"
      class="ak-operator-dossier-panel__section"
      data-testid="dossier-stories-section"
    >
      <header class="ak-operator-dossier-panel__section-header">
        <span class="ak-operator-dossier-panel__tag">
          {{ t('operators.detail.dossier.storiesTag') }}
        </span>
        <h3 class="ak-operator-dossier-panel__section-title">
          {{ t('operators.detail.dossier.storiesTitle') }}
        </h3>
      </header>

      <div class="ak-operator-dossier-panel__stories-list">
        <article
          v-for="(story, idx) in storiesData.standardStories"
          :key="`story-${idx}`"
          class="ak-operator-dossier-panel__story-card"
          :class="{
            'ak-operator-dossier-panel__story-card--expanded': expandedStandardStories.has(idx),
          }"
        >
          <button
            type="button"
            class="ak-operator-dossier-panel__story-toggle"
            :aria-expanded="expandedStandardStories.has(idx)"
            @click="toggleStandardStory(idx)"
          >
            <div class="ak-operator-dossier-panel__story-meta">
              <span class="ak-operator-dossier-panel__story-title">
                {{ resolveI18nString(story.storyTitle, locale as 'en' | 'zh') }}
              </span>
              <AkBadge
                v-if="formatUnlockCondition(story)"
                size="sm"
                variant="neutral"
                class="ak-operator-dossier-panel__story-unlock-badge"
              >
                {{ formatUnlockCondition(story) }}
              </AkBadge>
              <AkTranslationBadge
                v-if="hasTranslationFlag(story)"
                :source="getTranslationSource(story)"
                :stale="story.text.stale"
              />
            </div>
            <span class="ak-operator-dossier-panel__story-arrow" aria-hidden="true">
              {{ expandedStandardStories.has(idx) ? '▲' : '▼' }}
            </span>
          </button>

          <div
            v-if="expandedStandardStories.has(idx)"
            class="ak-operator-dossier-panel__story-body"
          >
            <p
              class="ak-operator-dossier-panel__story-text"
              :class="{
                'ak-operator-dossier-panel__story-text--pending':
                  story.text.source === 'pending' || isPendingTranslation(story.text),
              }"
            >
              {{ resolveI18nString(story.text, locale as 'en' | 'zh') }}
            </p>
          </div>
        </article>
      </div>
    </div>

    <!-- Section 4: Class Conversion / PATCH Stories -->
    <div
      v-if="storiesData.patchStories.length"
      class="ak-operator-dossier-panel__section ak-operator-dossier-panel__section--patch"
      data-testid="dossier-patch-section"
    >
      <header class="ak-operator-dossier-panel__section-header">
        <span class="ak-operator-dossier-panel__tag">
          {{ t('operators.detail.dossier.patchStoriesTag') }}
        </span>
        <h3 class="ak-operator-dossier-panel__section-title">
          {{ t('operators.detail.dossier.patchStoriesTitle') }}
        </h3>
      </header>

      <div class="ak-operator-dossier-panel__stories-list">
        <article
          v-for="(story, idx) in storiesData.patchStories"
          :key="`patch-story-${idx}`"
          class="ak-operator-dossier-panel__story-card ak-operator-dossier-panel__story-card--patch"
          :class="{
            'ak-operator-dossier-panel__story-card--expanded': expandedPatchStories.has(idx),
          }"
        >
          <button
            type="button"
            class="ak-operator-dossier-panel__story-toggle"
            :aria-expanded="expandedPatchStories.has(idx)"
            @click="togglePatchStory(idx)"
          >
            <div class="ak-operator-dossier-panel__story-meta">
              <span class="ak-operator-dossier-panel__story-title">
                {{ resolveI18nString(story.storyTitle, locale as 'en' | 'zh') }}
              </span>
              <AkBadge size="sm" variant="cyan" class="ak-operator-dossier-panel__patch-form-badge">
                {{
                  t('operators.detail.dossier.patchFormLabel', {
                    form: getPatchFormLabel(story.patchCharId),
                  })
                }}
              </AkBadge>
              <AkTranslationBadge
                v-if="hasTranslationFlag(story)"
                :source="getTranslationSource(story)"
                :stale="story.text.stale"
              />
            </div>
            <span class="ak-operator-dossier-panel__story-arrow" aria-hidden="true">
              {{ expandedPatchStories.has(idx) ? '▲' : '▼' }}
            </span>
          </button>

          <div v-if="expandedPatchStories.has(idx)" class="ak-operator-dossier-panel__story-body">
            <p
              class="ak-operator-dossier-panel__story-text"
              :class="{
                'ak-operator-dossier-panel__story-text--pending':
                  story.text.source === 'pending' || isPendingTranslation(story.text),
              }"
            >
              {{ resolveI18nString(story.text, locale as 'en' | 'zh') }}
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.ak-operator-dossier-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  margin-top: var(--space-md);

  &__loading {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__skeleton-card {
    height: 120px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    animation: ak-dossier-pulse 1.5s ease-in-out infinite;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);

    &--patch {
      border-top: 1px dashed var(--color-border-subtle);
      padding-top: var(--space-lg);
    }
  }

  &__section-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  &__section-title {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.06em;
    color: var(--color-text-primary);
    text-transform: uppercase;
  }

  &__grid {
    display: grid;
    gap: var(--space-md);

    &--profile {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-sm);
      padding: var(--space-md);
    }

    &--exam {
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    }
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    &--full {
      grid-column: 1 / -1;
      padding-top: var(--space-xs);
      border-top: 1px solid var(--color-border-subtle);
    }
  }

  &__item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
  }

  &__label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &__value {
    font-family: var(--font-body);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    line-height: var(--line-height-relaxed);

    &--pending {
      font-style: italic;
      color: var(--color-text-muted);
    }
  }

  &__exam-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: var(--space-sm);
    min-height: 84px;
    border-left: 3px solid var(--color-accent-amber);
  }

  &__exam-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-xs);
  }

  &__exam-title {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__exam-rating-wrap {
    display: flex;
    align-items: baseline;
  }

  &__exam-rating {
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: 0.04em;

    &--pending {
      font-size: var(--font-size-sm);
      font-style: italic;
      color: var(--color-text-muted);
    }
  }

  &__stories-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__story-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    transition: border-color 0.2s ease;

    &--expanded {
      border-color: var(--color-border-default);
    }

    &--patch {
      border-left: 3px solid var(--color-accent-cyan);
    }
  }

  &__story-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
    font-family: inherit;

    &:hover {
      background: var(--color-bg-surface-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--color-focus-ring);
      outline-offset: -2px;
    }
  }

  &__story-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  &__story-title {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    letter-spacing: 0.04em;
  }

  &__story-arrow {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    padding-left: var(--space-sm);
  }

  &__story-body {
    padding: 0 var(--space-md) var(--space-md) var(--space-md);
    border-top: 1px solid var(--color-border-subtle);
    padding-top: var(--space-md);
  }

  &__story-text {
    margin: 0;
    white-space: pre-wrap;
    line-height: var(--line-height-relaxed);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);

    &--pending {
      font-style: italic;
      color: var(--color-text-muted);
    }
  }
}

@keyframes ak-dossier-pulse {
  0%,
  100% {
    opacity: 0.6;
  }

  50% {
    opacity: 0.3;
  }
}
</style>
