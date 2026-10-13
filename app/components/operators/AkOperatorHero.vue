<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorDetail } from '~/../shared/schemas/operator'
import type { CalculatedStatsResult } from '~/../shared/utils/stats/types'
import { resolveAsset, LOW_RARITY_OPERATOR_IDS } from '~/../shared/utils/resolveAsset'
import AkButton from '~/components/ui/AkButton.vue'

interface Props {
  operator: OperatorDetail
  displayName: string
  operatorCode: string
  heroMeta: string
  stats: CalculatedStatsResult | null
  modelValueArt?: 'e0' | 'e2'
}

const props = withDefaults(defineProps<Props>(), {
  modelValueArt: 'e2',
})

const emit = defineEmits<{
  (e: 'update:modelValueArt' | 'openViewer', val: 'e0' | 'e2'): void
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const hasElite2Art = computed(() => {
  return props.operator.rarity >= 4 && !LOW_RARITY_OPERATOR_IDS.has(props.operator.id)
})

const currentStage = computed<'e0' | 'e2'>(() => {
  if (!hasElite2Art.value) return 'e0'
  return props.modelValueArt === 'e0' ? 'e0' : 'e2'
})

function setArtStage(stage: 'e0' | 'e2'): void {
  emit('update:modelValueArt', stage)
}

function handleOpenViewer(): void {
  emit('openViewer', currentStage.value)
}

const e0ArtUrls = computed(() =>
  resolveAsset('art', props.operator.id, { variant: '1', thumbnail: true }),
)
const e2ArtUrls = computed(() =>
  resolveAsset('art', props.operator.id, { variant: '2', thumbnail: true }),
)

const activeArtUrls = computed(() => {
  return currentStage.value === 'e2' ? e2ArtUrls.value : e0ArtUrls.value
})

const primaryArtUrl = computed(() => activeArtUrls.value[0] || '')
const secondaryArtUrl = computed(() => activeArtUrls.value[1] || '')

// Thumbnails for art variant switcher
const e0ThumbUrl = computed(() => resolveAsset('portrait', props.operator.id, { variant: '1' })[0])
const e2ThumbUrl = computed(() => resolveAsset('portrait', props.operator.id, { variant: '2' })[0])
</script>

<template>
  <div class="ak-operator-hero">
    <!-- Full-bleed visual section -->
    <section class="ak-operator-hero__stage">
      <!-- Background ambient glow & blurred dynamic artwork (desktop only) -->
      <div class="ak-operator-hero__blur-bg" aria-hidden="true">
        <img
          :src="primaryArtUrl"
          alt=""
          class="ak-operator-hero__blur-img"
          loading="eager"
          decoding="async"
        />
      </div>

      <div class="ak-operator-hero__radial-glow" aria-hidden="true" />

      <!-- Left gradient overlay for text readability -->
      <div class="ak-operator-hero__scrim" aria-hidden="true" />

      <!-- Back to Catalog Button -->
      <div class="ak-operator-hero__nav-back">
        <AkButton variant="ghost" size="sm" :to="localePath('/operators')">
          ← {{ t('operators.detail.backToList') }}
        </AkButton>
      </div>

      <!-- Main Stage Grid: Title on Left, Artwork on Right -->
      <div class="ak-operator-hero__content">
        <div class="ak-operator-hero__header-info">
          <span class="ak-operator-hero__code ak-page-header__code">
            {{ operatorCode }}
          </span>
          <p class="ak-operator-hero__meta">{{ heroMeta }}</p>
          <h1 class="ak-operator-hero__name ak-page-header__title">
            {{ displayName }}
          </h1>
        </div>

        <!-- Interactive Character Artwork Container -->
        <div class="ak-operator-hero__art-wrapper">
          <div
            class="ak-operator-hero__art-container"
            role="button"
            tabindex="0"
            :aria-label="`${displayName} artwork, ${currentStage.toUpperCase()}. Click to inspect full resolution.`"
            @click="handleOpenViewer"
            @keydown.enter="handleOpenViewer"
            @keydown.space.prevent="handleOpenViewer"
          >
            <Transition name="ak-hero-crossfade" mode="out-in">
              <img
                :key="currentStage"
                :src="primaryArtUrl"
                :alt="`${displayName} (${currentStage.toUpperCase()})`"
                loading="eager"
                fetchpriority="high"
                decoding="async"
                class="ak-operator-hero__art-img"
                @error="
                  (e) => {
                    const target = e.target as HTMLImageElement
                    if (secondaryArtUrl && target.src !== secondaryArtUrl) {
                      target.src = secondaryArtUrl
                    }
                  }
                "
              />
            </Transition>

            <span class="ak-operator-hero__art-inspect-hint" aria-hidden="true">
              <span class="ak-operator-hero__inspect-icon">🔍</span>
              <span>Inspect</span>
            </span>
          </div>

          <!-- Stage Switcher Chips (E0/E1, E2) -->
          <div v-if="hasElite2Art" class="ak-operator-hero__stage-switcher">
            <button
              type="button"
              class="ak-operator-hero__stage-btn"
              :class="{ 'ak-operator-hero__stage-btn--active': currentStage === 'e0' }"
              :aria-pressed="currentStage === 'e0'"
              @click="setArtStage('e0')"
            >
              <img
                :src="e0ThumbUrl"
                alt=""
                class="ak-operator-hero__stage-thumb"
                aria-hidden="true"
              />
              <span>E0 / E1</span>
            </button>

            <button
              type="button"
              class="ak-operator-hero__stage-btn"
              :class="{ 'ak-operator-hero__stage-btn--active': currentStage === 'e2' }"
              :aria-pressed="currentStage === 'e2'"
              @click="setArtStage('e2')"
            >
              <img
                :src="e2ThumbUrl"
                alt=""
                class="ak-operator-hero__stage-thumb"
                aria-hidden="true"
              />
              <span>E2</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Full-bleed Key Stats Overlapping Section -->
    <section class="ak-operator-hero__stats-bar">
      <div class="ak-operator-hero__stat-card">
        <span class="ak-operator-hero__stat-label">HP</span>
        <div class="ak-operator-hero__stat-val">
          {{ stats?.hp ?? '—' }}
        </div>
      </div>

      <div class="ak-operator-hero__stat-card ak-operator-hero__stat-card--highlight">
        <span class="ak-operator-hero__stat-label">ATK</span>
        <div class="ak-operator-hero__stat-val">
          {{ stats?.atk ?? '—' }}
        </div>
      </div>

      <div class="ak-operator-hero__stat-card">
        <span class="ak-operator-hero__stat-label">DEF</span>
        <div class="ak-operator-hero__stat-val">
          {{ stats?.def ?? '—' }}
        </div>
      </div>

      <div class="ak-operator-hero__stat-card">
        <span class="ak-operator-hero__stat-label">RES</span>
        <div class="ak-operator-hero__stat-val">
          {{ stats?.res ?? '—' }}
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-hero {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;

  &__stage {
    position: relative;
    width: 100%;
    min-height: 520px;
    overflow: hidden;
    background-color: var(--color-bg-base);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding-top: 76px; // Offset for transparent header

    @include mq(md) {
      min-height: 580px;
      padding-top: 84px;
    }

    @include mq(xl) {
      min-height: 640px;
      padding-top: 92px;
    }
  }

  // Dynamic Ambient Blurred Artwork
  &__blur-bg {
    display: none;
    position: absolute;
    inset: -50px;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;

    @include mq(md) {
      display: block;
    }
  }

  &__blur-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 80% 30%;
    filter: blur(56px) saturate(1.4);
    opacity: 0.22;
    transform: scale(1.15);
  }

  &__radial-glow {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(
      ellipse at 75% 35%,
      rgb(255 106 61 / 42%) 0%,
      rgb(122 42 20 / 22%) 42%,
      transparent 75%
    );
  }

  &__scrim {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgb(18 13 11 / 10%) 0%,
      rgb(18 13 11 / 85%) 60%,
      rgb(18 13 11 / 98%) 100%
    );

    @include mq(md) {
      background: linear-gradient(
        90deg,
        rgb(18 13 11 / 95%) 0%,
        rgb(18 13 11 / 75%) 45%,
        rgb(18 13 11 / 10%) 85%
      );
    }
  }

  &__nav-back {
    position: relative;
    z-index: 4;
    padding: var(--space-sm) var(--space-lg);

    @include mq(md) {
      padding: var(--space-sm) 48px;
    }
  }

  &__content {
    position: relative;
    z-index: 3;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0 var(--space-lg) var(--space-xl);
    box-sizing: border-box;

    @include mq(md) {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 48px var(--space-xl);
    }
  }

  &__header-info {
    max-width: 680px;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-bottom: var(--space-lg);

    @include mq(md) {
      margin-bottom: 32px;
    }
  }

  &__code {
    font-family: var(--font-display);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-display);
    color: var(--color-accent-amber);
    opacity: 0.8;
  }

  &__meta {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.14em;
    color: var(--color-accent-amber);
  }

  &__name {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(38px, 6vw, 84px);
    font-weight: var(--font-weight-extrabold);
    line-height: 0.95;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
  }

  &__art-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;

    @include mq(md) {
      align-items: flex-end;
    }
  }

  &__art-container {
    position: relative;
    width: 100%;
    max-width: 440px;
    height: 420px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    cursor: zoom-in;
    outline: none;

    @include focus-ring;

    @include mq(md) {
      width: 520px;
      max-width: none;
      height: 560px;
      justify-content: flex-end;
    }

    @include mq(xl) {
      width: 620px;
      height: 620px;
    }

    &:hover .ak-operator-hero__art-inspect-hint {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &__art-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: bottom center;
    filter: drop-shadow(0 14px 28px rgb(0 0 0 / 65%));
    transition:
      transform var(--transition-base),
      filter var(--transition-base);

    @include mq(md) {
      object-position: bottom right;
    }
  }

  &__art-container:hover &__art-img {
    transform: scale(1.02);
    filter: drop-shadow(0 18px 36px rgb(0 0 0 / 80%));
  }

  &__art-inspect-hint {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgb(18 13 11 / 85%);
    border: 1px solid var(--color-border-bold);
    border-radius: var(--radius-xs);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    opacity: 0;
    transform: translateY(6px);
    transition:
      opacity var(--transition-fast),
      transform var(--transition-fast);
    pointer-events: none;
  }

  &__inspect-icon {
    font-size: 13px;
  }

  // Stage Switcher
  &__stage-switcher {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    z-index: 4;
  }

  &__stage-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast),
      background var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-amber);
      color: var(--color-text-primary);
    }

    &--active {
      border-color: var(--color-accent-primary);
      background: rgb(255 106 61 / 15%);
      color: var(--color-text-primary);
    }
  }

  &__stage-thumb {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-none);
    object-fit: cover;
  }

  // Full-bleed Key Stats Bar
  &__stats-bar {
    position: relative;
    z-index: 4;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
    background-color: var(--color-border-base);
    border-top: 1px solid var(--color-border-base);
    border-bottom: 1px solid var(--color-border-base);

    @include mq(md) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__stat-card {
    background: var(--color-bg-deep);
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    @include mq(xl) {
      padding: 24px 48px;
    }

    &--highlight .ak-operator-hero__stat-val {
      color: var(--color-accent-primary);
    }
  }

  &__stat-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.14em;
    color: var(--color-text-secondary);
  }

  &__stat-val {
    font-family: var(--font-display);
    font-size: clamp(32px, 3.5vw, 44px);
    font-weight: var(--font-weight-extrabold);
    line-height: 1;
    color: var(--color-text-primary);
  }
}

// Crossfade transition
.ak-hero-crossfade-enter-active,
.ak-hero-crossfade-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}

.ak-hero-crossfade-enter-from,
.ak-hero-crossfade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .ak-hero-crossfade-enter-active,
  .ak-hero-crossfade-leave-active {
    transition: none !important;
  }
}
</style>
