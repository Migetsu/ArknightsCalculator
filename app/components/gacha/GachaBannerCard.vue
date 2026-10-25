<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GachaBanner } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import {
  formatBannerDateRange,
  formatHumanDate,
  getBannerLifecycleStatus,
  isProvenNotOnGlobal,
} from '~/../shared/utils/gacha'
import { resolveAsset, OPTIMIZED_ASSETS_CDN } from '~/../shared/utils/resolveAsset'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'
import GachaRateUpOps from '~/components/gacha/GachaRateUpOps.vue'

interface Props {
  banner: GachaBanner
  dateMode?: 'cn' | 'global'
  operatorsMap: Map<string, OperatorSummary>
  isSelected?: boolean
  globalEstimate?: string | null
  isNext?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  dateMode: 'global',
  isSelected: false,
  globalEstimate: null,
  isNext: false,
})

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const { t, locale } = useI18n()

const imageError = ref(false)

const bannerArtCandidates = computed<string[]>(() => {
  if (!props.banner.hasArt) return []
  const targetId = props.banner.artId || props.banner.id
  // `artId` is the published optimized file. resolveAsset prefers the legacy stripped `_EN`
  // id, which 404s for the EN banner that owns its own art, so the exact id goes first.
  const published = `${OPTIMIZED_ASSETS_CDN}/banners/${targetId}.webp`
  const candidates = resolveAsset('banner', targetId, { format: 'webp' })
  return [published, ...candidates.filter((url) => url !== published)]
})

const bannerArtUrl = computed<string | null>(() => {
  if (imageError.value || bannerArtCandidates.value.length === 0) return null
  return bannerArtCandidates.value[0] ?? null
})

function onImageError() {
  imageError.value = true
}

const bannerTitle = computed(() => {
  return (
    resolveI18nString(props.banner.title, locale.value as 'en' | 'zh') ||
    props.banner.title?.en ||
    props.banner.title?.zh ||
    ''
  )
})

const lifecycleStatus = computed<'active' | 'upcoming' | 'ended'>(() => {
  // The dataset marks the currently running CN pool at generation time, which keeps
  // the badge data-driven instead of depending on the wall clock.
  if (props.banner.isActive) return 'active'
  if (props.globalEstimate || props.isNext) return 'upcoming'
  return getBannerLifecycleStatus(props.banner)
})

function onBannerClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('a, button, [role="button"]')) return
  emit('select', props.banner.id)
}
const notOnGlobal = computed(() => isProvenNotOnGlobal(props.banner))

const formattedDates = computed(() => {
  // CN server dates are CN-local (UTC+8); openIso/endIso are UTC and can lag by a day.
  if (isCnServer.value && props.banner.cnStartDate && props.banner.cnEndDate) {
    return formatBannerDateRange(props.banner.cnStartDate, props.banner.cnEndDate)
  }
  if (props.banner.openIso && props.banner.endIso) {
    return formatBannerDateRange(props.banner.openIso, props.banner.endIso)
  }
  if (props.banner.openTime && props.banner.endTime) {
    return formatBannerDateRange(props.banner.openTime, props.banner.endTime)
  }
  if (props.banner.cnStartDate && props.banner.cnEndDate) {
    return formatBannerDateRange(props.banner.cnStartDate, props.banner.cnEndDate)
  }
  return ''
})

const formattedGlobalDates = computed(() => {
  if (props.banner.globalStartDate && props.banner.globalEndDate) {
    return formatBannerDateRange(props.banner.globalStartDate, props.banner.globalEndDate)
  }
  return ''
})

const formattedGlobalEstimate = computed(() => {
  if (!props.globalEstimate) return ''
  return formatHumanDate(props.globalEstimate)
})

const hasRateUp = computed(
  () =>
    props.banner.rateUp6.length > 0 ||
    (props.banner.secondaryRateUp6 ?? []).length > 0 ||
    props.banner.rateUp5.length > 0,
)
const hasContent = computed(() => Boolean(props.banner.description) || hasRateUp.value)
const isLimited = computed(() => props.banner.type === 'limited')
const isCnServer = computed(() => (props.banner.server ?? 'cn') === 'cn')

function parseTargetDateMs(dateStr: string): number | null {
  const normalized = dateStr.includes('/') ? dateStr.replace(/\//g, '-') : dateStr
  const d = new Date(normalized)
  const ms = d.getTime()
  return Number.isNaN(ms) ? null : ms
}

const daysUntilBanner = computed<number | null>(() => {
  if (lifecycleStatus.value !== 'upcoming') return null

  const targetDateStr =
    props.dateMode === 'cn'
      ? props.banner.cnStartDate ||
        props.banner.openIso ||
        (props.banner.openTime ? new Date(props.banner.openTime * 1000).toISOString() : null)
      : props.banner.globalStartDate ||
        props.globalEstimate ||
        props.banner.openIso ||
        (props.banner.openTime ? new Date(props.banner.openTime * 1000).toISOString() : null) ||
        props.banner.cnStartDate

  if (!targetDateStr) return null
  const targetMs = parseTargetDateMs(targetDateStr)
  if (targetMs === null) return null

  const now = Date.now()
  const diffMs = targetMs - now
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / 86400000)
})

const daysUntilText = computed<string>(() => {
  if (daysUntilBanner.value === null) return ''
  if (daysUntilBanner.value === 0) {
    return t('gacha.banner.startsToday')
  }
  if (daysUntilBanner.value === 1) {
    return t('gacha.banner.inOneDay')
  }
  return t('gacha.banner.inDays', { days: daysUntilBanner.value })
})
</script>

<template>
  <div
    class="gacha-banner"
    :class="[
      `gacha-banner--${banner.type}`,
      `gacha-banner--${lifecycleStatus}`,
      {
        'gacha-banner--selected': isSelected,
        'gacha-banner--no-rateup': !hasContent,
      },
    ]"
    @click="onBannerClick"
  >
    <!-- Card Column -->
    <div
      class="gacha-banner__card"
      role="button"
      tabindex="0"
      :aria-pressed="isSelected"
      :aria-label="bannerTitle"
      @click.stop="emit('select', banner.id)"
      @keydown.enter.space.prevent="emit('select', banner.id)"
    >
      <div
        class="gacha-banner__badge-bar"
        :class="{ 'gacha-banner__badge-bar--limited': isLimited }"
      >
        <span class="gacha-banner__title-text">{{ bannerTitle }}</span>
        <AkTranslationBadge
          v-if="banner.title?.source"
          :source="banner.title.source"
          :stale="banner.title.stale"
          class="gacha-banner__title-badge"
        />
      </div>

      <!-- Banner Art Frame -->
      <div class="gacha-banner__art">
        <img
          v-if="banner.hasArt && bannerArtUrl && !imageError"
          :src="bannerArtUrl"
          :alt="bannerTitle"
          width="480"
          height="236"
          loading="lazy"
          decoding="async"
          class="gacha-banner__art-img"
          @error="onImageError"
        />
        <template v-else>
          <div class="gacha-banner__art-grid" aria-hidden="true" />
          <span class="gacha-banner__art-tag">{{ banner.tag || 'HEADHUNTING' }}</span>
          <span class="gacha-banner__art-watermark">RHODESLAB // BANNER</span>
        </template>
      </div>

      <!-- Dates Block -->
      <div class="gacha-banner__dates">
        <div class="gacha-banner__date-row">
          <span class="gacha-banner__date-label">{{ isCnServer ? 'CN:' : 'EN:' }}</span>
          <b class="gacha-banner__date-val">
            {{ formattedDates }}
          </b>
        </div>
        <div
          v-if="dateMode === 'global' && isCnServer && formattedGlobalDates"
          class="gacha-banner__date-row"
        >
          <span class="gacha-banner__date-label">{{ t('gacha.banner.globalDate') }}:</span>
          <b class="gacha-banner__date-val">{{ formattedGlobalDates }}</b>
        </div>
        <div
          v-else-if="dateMode === 'global' && isCnServer && formattedGlobalEstimate"
          class="gacha-banner__date-row"
        >
          <span class="gacha-banner__date-label"> {{ t('gacha.banner.globalEstimate') }}: </span>
          <b class="gacha-banner__date-val">≈ {{ formattedGlobalEstimate }}</b>
          <span class="gacha-banner__est-badge">{{ t('gacha.banner.est') }}</span>
        </div>

        <div class="gacha-banner__countdown-wrap">
          <!-- Next banner expected on Global (first item of the upcoming window) -->
          <span
            v-if="isNext"
            class="gacha-banner__countdown-badge gacha-banner__countdown-badge--next"
          >
            {{ t('gacha.banner.nextOnGlobal') }}
          </span>

          <!-- Proven Not on Global yet badge (ONLY for proven LIMITED CN pool without EN pair) -->
          <span
            v-if="notOnGlobal"
            class="gacha-banner__countdown-badge gacha-banner__countdown-badge--not-on-en"
          >
            {{ t('gacha.banner.notOnGlobalYet') }}
          </span>

          <!-- Lifecycle Status Badge -->
          <span
            v-if="lifecycleStatus === 'active'"
            class="gacha-banner__countdown-badge gacha-banner__countdown-badge--active"
          >
            {{ t('gacha.banner.activeNow') }}
          </span>
          <span
            v-else-if="lifecycleStatus === 'upcoming'"
            class="gacha-banner__countdown-badge gacha-banner__countdown-badge--upcoming"
          >
            {{ t('gacha.banner.upcoming') }}
          </span>
          <span v-else class="gacha-banner__countdown-badge gacha-banner__countdown-badge--ended">
            {{ t('gacha.banner.ended') }}
          </span>

          <!-- Days until banner badge for upcoming status -->
          <span
            v-if="lifecycleStatus === 'upcoming' && daysUntilText"
            class="gacha-banner__countdown-badge gacha-banner__countdown-badge--days"
          >
            {{ daysUntilText }}
          </span>
        </div>
      </div>
    </div>

    <!-- Right Column: Rate-up Operators (rendered ONLY if rateUp operators or description exist) -->
    <div v-if="hasContent" class="gacha-banner__content">
      <p v-if="banner.description" class="gacha-banner__desc">
        {{ banner.description }}
      </p>

      <GachaRateUpOps v-if="hasRateUp" :banner="banner" :operators-map="operatorsMap" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gacha-banner {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: var(--space-xl, 32px);
  padding: var(--space-lg, 24px);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid rgb(232 221 211 / 7%);
  min-width: 0;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);

  &:hover {
    border-color: var(--color-border-bold);
  }

  &--selected {
    border-color: var(--color-accent-amber);
    box-shadow:
      0 0 0 1px var(--color-accent-amber),
      0 4px 16px rgb(255 157 43 / 15%);
  }

  &--active {
    border-left: 3px solid var(--color-status-success, #22c55e);
  }

  &--ended {
    opacity: 0.92;
  }

  &--no-rateup {
    grid-template-columns: minmax(0, 340px);
    max-width: 100%;

    .gacha-banner__card {
      max-width: 340px;
    }

    .gacha-banner__art {
      height: 150px;
    }
  }

  @media (width <= 820px) {
    grid-template-columns: 1fr;
    gap: var(--space-md, 20px);
    padding: var(--space-md, 16px);
  }

  &__card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    cursor: pointer;

    &:focus-visible {
      @include focus-ring;

      outline-offset: 2px;
    }
  }

  &__badge-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-2xs, 4px);
    background-color: var(--color-accent-amber, #ff9d2b);
    color: var(--color-bg-deep, #120d0b);
    padding: 9px 12px;
    text-align: center;
    font-family: var(--font-heading);
    font-size: var(--font-size-xs, 13px);
    font-weight: var(--font-weight-extrabold);
    line-height: 1.35;
    letter-spacing: 0.02em;
    overflow-wrap: break-word;
    min-width: 0;

    &--limited {
      background-color: var(--color-accent-primary, #ff6a3d);
      color: #120d0b;
    }
  }

  &__art {
    height: 150px;
    background: linear-gradient(135deg, #4a2418 0%, #17110f 100%);
    border: 1px solid var(--color-border-subtle);
    border-top: none;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    gap: var(--space-2xs);
  }

  &__art-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }

  &__art-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, rgb(255 255 255 / 4%) 1px, transparent 1px),
      linear-gradient(to bottom, rgb(255 255 255 / 4%) 1px, transparent 1px);
    background-size: 16px 16px;
    pointer-events: none;
  }

  &__art-tag {
    position: relative;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.2em;
    color: var(--color-text-accent, #ffd9a8);
    text-transform: uppercase;
  }

  &__art-watermark {
    position: relative;
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    letter-spacing: 0.15em;
    color: var(--color-text-muted);
  }

  &__dates {
    padding: 12px 4px 0;
    text-align: center;
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 13px);
    line-height: 1.7;
    color: var(--color-text-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  &__date-row {
    display: flex;
    gap: var(--space-2xs);
    flex-wrap: wrap;
    justify-content: center;
    min-width: 0;
    max-width: 100%;
  }

  &__date-label {
    color: var(--color-text-muted);
  }

  &__date-val {
    color: var(--color-text-primary);
    font-family: var(--font-mono);
  }

  &__est-badge {
    display: inline-block;
    padding: 1px 6px;
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs, 10px);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.08em;
    color: var(--color-accent-amber);
    border: 1px solid var(--color-accent-amber);
    background-color: rgb(255 157 43 / 10%);
  }

  &__countdown-wrap {
    margin-top: 6px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }

  &__countdown-badge {
    display: inline-block;
    padding: 3px 10px;
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs, 11px);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background-color: var(--color-bg-deep);

    &--upcoming {
      border: 1px solid var(--color-accent-amber, #ffd9a8);
      color: var(--color-accent-amber, #ffd9a8);
    }

    &--days {
      border: 1px solid var(--color-accent-amber, #ffd9a8);
      color: var(--color-accent-amber, #ffd9a8);
      background-color: rgb(255 157 43 / 10%);
      font-weight: var(--font-weight-bold);
    }

    &--active {
      border: 1px solid var(--color-status-success);
      color: var(--color-status-success);
    }

    &--ended {
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-muted);
    }

    &--not-on-en {
      border: 1px solid var(--color-accent-primary, #ff6a3d);
      color: var(--color-accent-primary, #ff6a3d);
      background-color: rgb(255 106 61 / 10%);
      font-weight: var(--font-weight-bold);
    }

    &--next {
      border: 1px solid var(--color-accent-amber, #ff9d2b);
      color: var(--color-bg-deep, #120d0b);
      background-color: var(--color-accent-amber, #ff9d2b);
      font-weight: var(--font-weight-bold);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  &__desc {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-sm, 14px);
    line-height: 1.55;
    color: var(--color-text-secondary);
  }
}
</style>
