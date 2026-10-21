<script setup lang="ts">
import { computed } from 'vue'
import type { GachaBanner } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import AkAvatar from '~/components/ui/AkAvatar.vue'

interface Props {
  banner: GachaBanner
  operatorsMap: Map<string, OperatorSummary>
}

const props = defineProps<Props>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

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

const isLimited = computed(() => props.banner.type === 'limited')
</script>

<template>
  <div class="gacha-rate-up">
    <!-- Primary 6★ Rate-up (when distinct) & Other 6★ Rate-up -->
    <template v-if="primaryRateUp6Op && otherRateUp6Ops.length > 0">
      <!-- Main / Primary 6★ -->
      <div class="gacha-rate-up__section gacha-banner__ops-section">
        <h3
          class="gacha-rate-up__heading gacha-rate-up__heading--six gacha-banner__ops-heading gacha-banner__ops-heading--six"
        >
          {{ isLimited ? t('gacha.banner.rateUp') : t('gacha.banner.primaryRateUp') }}
        </h3>
        <div class="gacha-rate-up__grid gacha-banner__ops-grid">
          <NuxtLink
            :to="localePath(`/operators/${primaryRateUp6Op.id}`)"
            class="gacha-rate-up__op-link gacha-banner__op-link"
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
      <div class="gacha-rate-up__section gacha-banner__ops-section">
        <h3
          class="gacha-rate-up__heading gacha-rate-up__heading--six gacha-banner__ops-heading gacha-banner__ops-heading--six"
        >
          {{ t('gacha.banner.otherSixStar') }}
        </h3>
        <div class="gacha-rate-up__grid gacha-banner__ops-grid">
          <NuxtLink
            v-for="op in otherRateUp6Ops"
            :key="op.id"
            :to="localePath(`/operators/${op.id}`)"
            class="gacha-rate-up__op-link gacha-banner__op-link"
            :title="op.name"
          >
            <AkAvatar :id="op.id" :name="op.name" :rarity="op.rarity" :size="56" />
          </NuxtLink>
        </div>
      </div>
    </template>

    <!-- Standard 6★ Rate-up (when single 6★ or no distinct primary) -->
    <div v-else-if="rateUp6Ops.length > 0" class="gacha-rate-up__section gacha-banner__ops-section">
      <h3
        class="gacha-rate-up__heading gacha-rate-up__heading--six gacha-banner__ops-heading gacha-banner__ops-heading--six"
      >
        {{
          isLimited && rateUp6Ops.length === 1
            ? t('gacha.banner.rateUp')
            : t('gacha.banner.sixStar')
        }}
      </h3>
      <div class="gacha-rate-up__grid gacha-banner__ops-grid">
        <NuxtLink
          v-for="op in rateUp6Ops"
          :key="op.id"
          :to="localePath(`/operators/${op.id}`)"
          class="gacha-rate-up__op-link gacha-banner__op-link"
          :title="op.name"
        >
          <AkAvatar :id="op.id" :name="op.name" :rarity="op.rarity" :size="56" />
        </NuxtLink>
      </div>
    </div>

    <!-- Secondary 6★ Rate-up (sparkable / past limited reruns) -->
    <div
      v-if="secondaryRateUp6Ops.length > 0"
      class="gacha-rate-up__section gacha-banner__ops-section"
    >
      <h3
        class="gacha-rate-up__heading gacha-rate-up__heading--secondary gacha-banner__ops-heading gacha-banner__ops-heading--secondary"
      >
        {{ t('gacha.banner.secondaryRateUp') }}
      </h3>
      <div class="gacha-rate-up__grid gacha-banner__ops-grid">
        <NuxtLink
          v-for="op in secondaryRateUp6Ops"
          :key="op.id"
          :to="localePath(`/operators/${op.id}`)"
          class="gacha-rate-up__op-link gacha-banner__op-link"
          :title="op.name"
        >
          <AkAvatar :id="op.id" :name="op.name" :rarity="op.rarity" :size="48" />
        </NuxtLink>
      </div>
    </div>

    <!-- 5★ Rate-up -->
    <div v-if="rateUp5Ops.length > 0" class="gacha-rate-up__section gacha-banner__ops-section">
      <h3
        class="gacha-rate-up__heading gacha-rate-up__heading--five gacha-banner__ops-heading gacha-banner__ops-heading--five"
      >
        {{ t('gacha.banner.fiveStar') }}
      </h3>
      <div class="gacha-rate-up__grid gacha-banner__ops-grid">
        <NuxtLink
          v-for="op in rateUp5Ops"
          :key="op.id"
          :to="localePath(`/operators/${op.id}`)"
          class="gacha-rate-up__op-link gacha-banner__op-link"
          :title="op.name"
        >
          <AkAvatar :id="op.id" :name="op.name" :rarity="op.rarity" :size="56" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gacha-rate-up {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__heading {
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

  &__grid {
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
