<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorDetail } from '~~/shared/schemas/operator'
import type { Skin } from '~~/shared/schemas/skin'
import { resolveAsset } from '~~/shared/utils/resolveAsset'
import { sortOperatorSkins, formatSkinPriceStatus } from '~~/shared/utils/skin'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'

interface Props {
  operator: OperatorDetail
  skins?: Skin[]
}

const props = withDefaults(defineProps<Props>(), {
  skins: () => [],
})

const emit = defineEmits<{
  (e: 'inspect', skinId: string): void
}>()

const { t } = useI18n()

// Sorted skins list (canonical default appearances first, then cosmetic outfits)
const sortedSkins = computed(() => {
  return sortOperatorSkins(props.skins)
})

function getSkinDisplayName(skin: Skin): string {
  return skin.skinName.en || skin.skinName.zh || skin.skinId
}

function getSkinBrandName(skin: Skin): string {
  if (skin.brandName?.en || skin.brandName?.zh) {
    return skin.brandName.en || skin.brandName.zh || '—'
  }
  return skin.isDefault ? t('operators.detail.skins.statusBase') : '—'
}

function getSkinObtainApproach(skin: Skin): string {
  if (skin.obtainApproach?.en || skin.obtainApproach?.zh) {
    return skin.obtainApproach.en || skin.obtainApproach.zh || '—'
  }
  return skin.isDefault ? t('operators.detail.skins.statusBase') : '—'
}

function getSkinPreviewUrl(skin: Skin): string {
  const candidates = resolveAsset('art', skin.charId, {
    variant: skin.skinId,
    thumbnail: true,
  })
  return candidates[0] || ''
}

function getSkinSecondaryUrl(skin: Skin): string {
  const candidates = resolveAsset('art', skin.charId, {
    variant: skin.skinId,
    thumbnail: true,
  })
  return candidates[1] || ''
}

function handleImageError(e: Event, secondaryUrl: string): void {
  const target = e.target as HTMLImageElement
  if (secondaryUrl && target.src !== secondaryUrl) {
    target.src = secondaryUrl
  }
}
</script>

<template>
  <div class="ak-operator-skins-panel">
    <!-- Empty State -->
    <AkEmptyState
      v-if="sortedSkins.length === 0"
      icon="lucide:shirt"
      :title="t('operators.detail.skins.emptyTitle')"
      :description="t('operators.detail.skins.emptyDesc')"
    />

    <!-- Skins Content -->
    <div v-else class="ak-operator-skins-panel__content">
      <!-- Section Header -->
      <header class="ak-operator-skins-panel__header">
        <div class="ak-operator-skins-panel__title-wrap">
          <span class="ak-operator-skins-panel__tag">PRTS // WARDROBE</span>
          <h2 class="ak-operator-skins-panel__title">
            {{ t('operators.detail.skins.title') }}
          </h2>
          <p class="ak-operator-skins-panel__subtitle">
            {{ t('operators.detail.skins.subtitle') }}
          </p>
        </div>
        <div class="ak-operator-skins-panel__counter">
          <AkBadge variant="neutral">
            {{ sortedSkins.length }} {{ sortedSkins.length === 1 ? 'OUTFIT' : 'OUTFITS' }}
          </AkBadge>
        </div>
      </header>

      <!-- Skins Grid -->
      <div class="ak-operator-skins-panel__grid">
        <article
          v-for="skin in sortedSkins"
          :key="skin.skinId"
          class="ak-operator-skins-panel__card"
          :class="{
            'ak-operator-skins-panel__card--default': skin.isDefault,
            'ak-operator-skins-panel__card--cn': skin.isCnOnly,
          }"
        >
          <!-- Thumbnail Preview Banner -->
          <div
            class="ak-operator-skins-panel__preview-wrapper"
            role="button"
            tabindex="0"
            :aria-label="`Inspect artwork for ${getSkinDisplayName(skin)}`"
            @click="emit('inspect', skin.skinId)"
            @keydown.enter="emit('inspect', skin.skinId)"
            @keydown.space.prevent="emit('inspect', skin.skinId)"
          >
            <img
              :src="getSkinPreviewUrl(skin)"
              :alt="getSkinDisplayName(skin)"
              loading="lazy"
              decoding="async"
              class="ak-operator-skins-panel__preview-img"
              @error="(e) => handleImageError(e, getSkinSecondaryUrl(skin))"
            />

            <div class="ak-operator-skins-panel__preview-scrim" />

            <!-- Badges Floating in Preview Corner -->
            <div class="ak-operator-skins-panel__badges">
              <!-- CN-Only Badge -->
              <AkBadge v-if="skin.isCnOnly" variant="amber" size="sm">
                {{ t('operators.detail.skins.cnOnly') }}
              </AkBadge>

              <!-- Price Status Badge (Honest Status Only, No Numbers) -->
              <AkBadge
                v-if="skin.priceStatus === 'free'"
                variant="green"
                size="sm"
                class="ak-operator-skins-panel__price-badge"
              >
                {{ formatSkinPriceStatus(skin.priceStatus) }}
              </AkBadge>
              <AkBadge
                v-else-if="skin.priceStatus === 'default'"
                variant="neutral"
                size="sm"
                class="ak-operator-skins-panel__price-badge"
              >
                {{ formatSkinPriceStatus(skin.priceStatus) }}
              </AkBadge>
              <AkBadge
                v-else
                variant="neutral"
                size="sm"
                class="ak-operator-skins-panel__price-badge"
              >
                {{ formatSkinPriceStatus(skin.priceStatus) }}
              </AkBadge>
            </div>

            <!-- Inspect Hint on Hover -->
            <div class="ak-operator-skins-panel__inspect-overlay" aria-hidden="true">
              <span class="ak-operator-skins-panel__inspect-icon">🔍</span>
              <span class="ak-operator-skins-panel__inspect-text">
                {{ t('operators.detail.skins.inspect') }}
              </span>
            </div>
          </div>

          <!-- Card Body Details -->
          <div class="ak-operator-skins-panel__body">
            <!-- Outfit Name & Pending Translation Badge -->
            <div class="ak-operator-skins-panel__name-wrap">
              <h3 class="ak-operator-skins-panel__name">
                {{ getSkinDisplayName(skin) }}
              </h3>
              <AkTranslationBadge
                v-if="skin.skinName?.source"
                :source="skin.skinName.source"
                :stale="skin.skinName.stale"
              />
            </div>

            <!-- Metadata List: Brand, Acquisition, Artist -->
            <dl class="ak-operator-skins-panel__meta">
              <!-- Fashion Brand -->
              <div class="ak-operator-skins-panel__meta-row">
                <dt class="ak-operator-skins-panel__meta-dt">
                  {{ t('operators.detail.skins.brand') }}
                </dt>
                <dd class="ak-operator-skins-panel__meta-dd">
                  <span>{{ getSkinBrandName(skin) }}</span>
                  <AkTranslationBadge
                    v-if="skin.brandName?.source"
                    :source="skin.brandName.source"
                    :stale="skin.brandName.stale"
                  />
                </dd>
              </div>

              <!-- Acquisition Approach -->
              <div class="ak-operator-skins-panel__meta-row">
                <dt class="ak-operator-skins-panel__meta-dt">
                  {{ t('operators.detail.skins.acquisition') }}
                </dt>
                <dd class="ak-operator-skins-panel__meta-dd">
                  <span>{{ getSkinObtainApproach(skin) }}</span>
                  <AkTranslationBadge
                    v-if="skin.obtainApproach?.source"
                    :source="skin.obtainApproach.source"
                    :stale="skin.obtainApproach.stale"
                  />
                </dd>
              </div>

              <!-- Artist / Drawer List -->
              <div
                v-if="skin.drawerList && skin.drawerList.length > 0"
                class="ak-operator-skins-panel__meta-row"
              >
                <dt class="ak-operator-skins-panel__meta-dt">
                  {{ t('operators.detail.skins.illustrator') }}
                </dt>
                <dd class="ak-operator-skins-panel__meta-dd">
                  <span>{{ skin.drawerList.join(', ') }}</span>
                </dd>
              </div>
            </dl>

            <!-- Dialogue / Outfit Lore Quote -->
            <blockquote
              v-if="skin.dialog?.en || skin.dialog?.zh"
              class="ak-operator-skins-panel__quote"
            >
              <p class="ak-operator-skins-panel__quote-text">
                “{{ skin.dialog.en || skin.dialog.zh }}”
              </p>
              <AkTranslationBadge
                v-if="skin.dialog?.source"
                :source="skin.dialog.source"
                :stale="skin.dialog.stale"
              />
            </blockquote>

            <!-- Description / Lore text -->
            <p
              v-else-if="skin.description?.en || skin.description?.zh"
              class="ak-operator-skins-panel__desc"
            >
              {{ skin.description.en || skin.description.zh }}
              <AkTranslationBadge
                v-if="skin.description?.source"
                :source="skin.description.source"
                :stale="skin.description.stale"
              />
            </p>

            <!-- Card Bottom Action -->
            <div class="ak-operator-skins-panel__actions">
              <AkButton variant="secondary" size="sm" block @click="emit('inspect', skin.skinId)">
                🔍 {{ t('operators.detail.skins.inspect') }}
              </AkButton>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-skins-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: var(--space-md);

    @include mq(sm) {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }
  }

  &__title-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  &__tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.16em;
    color: var(--color-accent-amber);
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(20px, 2.5vw, 28px);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-display);
    color: var(--color-text-primary);
  }

  &__subtitle {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__counter {
    align-self: flex-start;

    @include mq(sm) {
      align-self: flex-end;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-lg);
    width: 100%;
    box-sizing: border-box;

    @include mq(sm) {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mq(lg) {
      grid-template-columns: repeat(3, 1fr);
    }

    @include mq(xl) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__card {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    overflow: hidden;
    transition:
      border-color var(--transition-fast),
      transform var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover {
      border-color: var(--color-accent-primary);
      box-shadow: 0 10px 24px rgb(0 0 0 / 40%);
    }

    &--cn {
      border-left: 2px solid var(--color-accent-amber);
    }
  }

  &__preview-wrapper {
    position: relative;
    width: 100%;
    height: 280px;
    background: radial-gradient(
      ellipse at 50% 65%,
      rgb(255 106 61 / 10%) 0%,
      rgb(18 13 11 / 95%) 85%
    );
    overflow: hidden;
    cursor: pointer;
    outline: none;

    @include focus-ring;

    &:hover &__preview-img {
      transform: scale(1.04);
    }

    &:hover &__inspect-overlay {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &__preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: bottom center;
    filter: drop-shadow(0 8px 16px rgb(0 0 0 / 70%));
    transition: transform var(--transition-base);
    user-select: none;
    pointer-events: none;
  }

  &__preview-scrim {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgb(18 13 11 / 40%) 0%,
      rgb(18 13 11 / 0%) 30%,
      rgb(18 13 11 / 80%) 100%
    );
  }

  &__badges {
    position: absolute;
    top: var(--space-xs);
    left: var(--space-xs);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2xs);
    z-index: 2;
  }

  &__price-badge {
    text-transform: uppercase;
  }

  &__inspect-overlay {
    position: absolute;
    bottom: var(--space-xs);
    right: var(--space-xs);
    display: inline-flex;
    align-items: center;
    gap: var(--space-3xs);
    padding: 4px 10px;
    background: rgb(18 13 11 / 85%);
    border: 1px solid var(--color-border-bold);
    border-radius: var(--radius-xs);
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    opacity: 0;
    transform: translateY(4px);
    transition:
      opacity var(--transition-fast),
      transform var(--transition-fast);
    pointer-events: none;
    z-index: 2;
  }

  &__inspect-icon {
    font-size: 11px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: var(--space-md);
    gap: var(--space-sm);
  }

  &__name-wrap {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-xs);
    min-width: 0;
  }

  &__name {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: 1.25;
    overflow-wrap: break-word;
  }

  &__meta {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  &__meta-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-xs);
    font-size: var(--font-size-xs);
  }

  &__meta-dt {
    font-family: var(--font-body);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }

  &__meta-dd {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    font-family: var(--font-body);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-semibold);
    text-align: right;
    overflow-wrap: break-word;
  }

  &__quote {
    margin: 0;
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-deep);
    border-left: 2px solid var(--color-accent-amber);
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  &__quote-text {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-style: italic;
    color: var(--color-text-secondary);
    line-height: 1.4;
    overflow-wrap: break-word;
  }

  &__desc {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    color: var(--color-text-secondary);
    line-height: 1.4;
    overflow-wrap: break-word;
  }

  &__actions {
    margin-top: auto;
    padding-top: var(--space-xs);
  }
}
</style>
