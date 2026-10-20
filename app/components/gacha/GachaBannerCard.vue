<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GachaBanner } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import {
  formatBannerDateRange,
  getBannerLifecycleStatus,
  isProvenNotOnGlobal,
} from '~/../shared/utils/gacha'
import { resolveAsset } from '~/../shared/utils/resolveAsset'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'

interface Props {
  banner: GachaBanner
  dateMode?: 'cn' | 'global'
  operatorsMap: Map<string, OperatorSummary>
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  dateMode: 'global',
  isSelected: false,
})

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const imageError = ref(false)

const bannerArtCandidates = computed<string[]>(() => {
  if (!props.banner.hasArt) return []
  const targetId = props.banner.artId || props.banner.id
  return resolveAsset('banner', targetId, { format: 'webp' })
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

const lifecycleStatus = computed(() => getBannerLifecycleStatus(props.banner))
const notOnGlobal = computed(() => isProvenNotOnGlobal(props.banner))

const formattedDates = computed(() => {
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

function getOperatorName(id: string): string {
  const op = props.operatorsMap.get(id)
  if (!op) return id
  return resolveI18nString(op.name, locale.value as 'en' | 'zh') || op.name.en || id
}

interface BannerOp {
  id: string
  name: string
  rarity: 1 | 2 | 3 | 4 | 5 | 6
}

const primaryRateUp6Op = computed<BannerOp | null>(() => {
  const id = props.banner.primaryRateUp6
  if (!id) return null
  return {
    id,
    name: getOperatorName(id),
    rarity: 6,
  }
})

const otherRateUp6Ops = computed<BannerOp[]>(() => {
  const primaryId = props.banner.primaryRateUp6
  return props.banner.rateUp6
    .filter((id) => id !== primaryId)
    .map((id) => ({
      id,
      name: getOperatorName(id),
      rarity: 6,
    }))
})

const rateUp6Ops = computed<BannerOp[]>(() => {
  return props.banner.rateUp6.map((id) => ({
    id,
    name: getOperatorName(id),
    rarity: 6,
  }))
})

const secondaryRateUp6Ops = computed<BannerOp[]>(() => {
  return (props.banner.secondaryRateUp6 ?? []).map((id) => ({
    id,
    name: getOperatorName(id),
    rarity: 6,
  }))
})

const rateUp5Ops = computed<BannerOp[]>(() => {
  return props.banner.rateUp5.map((id) => ({
    id,
    name: getOperatorName(id),
    rarity: 5,
  }))
})

const hasRateUp = computed(
  () =>
    rateUp6Ops.value.length > 0 ||
    secondaryRateUp6Ops.value.length > 0 ||
    rateUp5Ops.value.length > 0,
)
const hasContent = computed(() => Boolean(props.banner.description) || hasRateUp.value)
const isLimited = computed(() => props.banner.type === 'limited')
const isCnServer = computed(() => (props.banner.server ?? 'cn') === 'cn')
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
    role="button"
    tabindex="0"
    :aria-pressed="isSelected"
    @click="emit('select', banner.id)"
    @keydown.enter.space.prevent="emit('select', banner.id)"
  >
    <!-- Card Column -->
    <div class="gacha-banner__card">
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
          <span class="gacha-banner__art-watermark">ARKCALC // BANNER</span>
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

        <div class="gacha-banner__countdown-wrap">
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
        </div>
      </div>
    </div>

    <!-- Right Column: Rate-up Operators (rendered ONLY if rateUp operators or description exist) -->
    <div v-if="hasContent" class="gacha-banner__content">
      <p v-if="banner.description" class="gacha-banner__desc">
        {{ banner.description }}
      </p>

      <!-- Primary 6★ Rate-up (when distinct) & Other 6★ Rate-up -->
      <template v-if="primaryRateUp6Op && otherRateUp6Ops.length > 0">
        <!-- Main / Primary 6★ -->
        <div class="gacha-banner__ops-section">
          <h3 class="gacha-banner__ops-heading gacha-banner__ops-heading--six">
            {{ isLimited ? t('gacha.banner.rateUp') : t('gacha.banner.primaryRateUp') }}
          </h3>
          <div class="gacha-banner__ops-grid">
            <NuxtLink
              :to="localePath(`/operators/${primaryRateUp6Op.id}`)"
              class="gacha-banner__op-link"
              :title="primaryRateUp6Op.name"
            >
              <AkAvatar
                :id="primaryRateUp6Op.id"
                :name="primaryRateUp6Op.name"
                :rarity="primaryRateUp6Op.rarity"
                :size="56"
              />
            </NuxtLink>
          </div>
        </div>

        <!-- Other 6★ Rate-up -->
        <div class="gacha-banner__ops-section">
          <h3 class="gacha-banner__ops-heading gacha-banner__ops-heading--six">
            {{ t('gacha.banner.otherSixStar') }}
          </h3>
          <div class="gacha-banner__ops-grid">
            <NuxtLink
              v-for="op in otherRateUp6Ops"
              :key="op.id"
              :to="localePath(`/operators/${op.id}`)"
              class="gacha-banner__op-link"
              :title="op.name"
            >
              <AkAvatar :id="op.id" :name="op.name" :rarity="op.rarity" :size="56" />
            </NuxtLink>
          </div>
        </div>
      </template>

      <!-- Standard 6★ Rate-up (when single 6★ or no distinct primary) -->
      <div v-else-if="rateUp6Ops.length > 0" class="gacha-banner__ops-section">
        <h3 class="gacha-banner__ops-heading gacha-banner__ops-heading--six">
          {{
            isLimited && rateUp6Ops.length === 1
              ? t('gacha.banner.rateUp')
              : t('gacha.banner.sixStar')
          }}
        </h3>
        <div class="gacha-banner__ops-grid">
          <NuxtLink
            v-for="op in rateUp6Ops"
            :key="op.id"
            :to="localePath(`/operators/${op.id}`)"
            class="gacha-banner__op-link"
            :title="op.name"
          >
            <AkAvatar :id="op.id" :name="op.name" :rarity="op.rarity" :size="56" />
          </NuxtLink>
        </div>
      </div>

      <!-- Secondary 6★ Rate-up (sparkable / past limited reruns) -->
      <div v-if="secondaryRateUp6Ops.length > 0" class="gacha-banner__ops-section">
        <h3 class="gacha-banner__ops-heading gacha-banner__ops-heading--secondary">
          {{ t('gacha.banner.secondaryRateUp') }}
        </h3>
        <div class="gacha-banner__ops-grid">
          <NuxtLink
            v-for="op in secondaryRateUp6Ops"
            :key="op.id"
            :to="localePath(`/operators/${op.id}`)"
            class="gacha-banner__op-link"
            :title="op.name"
          >
            <AkAvatar :id="op.id" :name="op.name" :rarity="op.rarity" :size="48" />
          </NuxtLink>
        </div>
      </div>

      <!-- 5★ Rate-up -->
      <div v-if="rateUp5Ops.length > 0" class="gacha-banner__ops-section">
        <h3 class="gacha-banner__ops-heading gacha-banner__ops-heading--five">
          {{ t('gacha.banner.fiveStar') }}
        </h3>
        <div class="gacha-banner__ops-grid">
          <NuxtLink
            v-for="op in rateUp5Ops"
            :key="op.id"
            :to="localePath(`/operators/${op.id}`)"
            class="gacha-banner__op-link"
            :title="op.name"
          >
            <AkAvatar :id="op.id" :name="op.name" :rarity="op.rarity" :size="56" />
          </NuxtLink>
        </div>
      </div>
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

  &:focus-visible {
    @include focus-ring;
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
    grid-template-columns: 1fr;
    max-width: 100%;

    .gacha-banner__card {
      max-width: 100%;
    }

    .gacha-banner__art {
      height: 100px;
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

  &__ops-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__ops-heading {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-2xs, 11px);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.14em;
    text-transform: uppercase;

    &--six {
      color: var(--color-accent-amber, #ffd9a8);
    }

    &--secondary {
      color: var(--color-accent-primary, #ff6a3d);
    }

    &--five {
      color: var(--color-rarity-5, #ffd54f);
    }
  }

  &__ops-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__op-link {
    display: inline-flex;
    text-decoration: none;
    transition: transform var(--transition-fast);

    &:hover {
      transform: translateY(-2px);
    }

    &:focus-visible {
      @include focus-ring;
    }
  }
}
</style>
