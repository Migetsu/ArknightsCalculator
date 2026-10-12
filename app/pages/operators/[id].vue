<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import rawOperatorsData from '~/../data/operators-index.json'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkPanel from '~/components/ui/AkPanel.vue'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkAlert from '~/components/ui/AkAlert.vue'

const route = useRoute()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const id = computed(() => route.params.id as string)

const allOperators = rawOperatorsData as unknown as readonly OperatorSummary[]
const operator = computed(() => allOperators.find((op) => op.id === id.value))

const operatorId = computed(() => operator.value?.id ?? id.value)
const displayName = computed(() => {
  if (!operator.value) return ''
  return (
    resolveI18nString(operator.value.name, locale.value as 'en' | 'ru' | 'zh') ||
    operator.value.name.en
  )
})

const operatorCode = computed(() => operator.value?.displayNumber ?? 'OPS-DETAIL')
const operatorSubclass = computed(() => operator.value?.subclass ?? '')
const operatorClass = computed(() => operator.value?.class ?? 'PIONEER')
const operatorWatermark = computed(
  () => operator.value?.appellation || operator.value?.class || 'OPERATOR',
)
const operatorRarity = computed(() => (operator.value?.rarity ?? 1) as 1 | 2 | 3 | 4 | 5 | 6)
const operatorFaction = computed(() => operator.value?.faction)
const operatorPosition = computed(() => operator.value?.position ?? 'RANGED')
const operatorServers = computed(() => operator.value?.servers ?? [])

useSeoMeta({
  title: () =>
    operator.value
      ? `${displayName.value} | ${t('operators.title')} | ${t('common.appName')}`
      : `${t('operators.title')} | ${t('common.appName')}`,
  description: () =>
    operator.value
      ? `${displayName.value} (${operatorRarity.value}★ ${t('operators.classes.' + operatorClass.value)})`
      : t('operators.subtitle'),
})
</script>

<template>
  <div class="operator-detail-page">
    <AkContainer size="lg" class="operator-detail-page__container">
      <template v-if="operator">
        <AkPageHeader
          :code="operatorCode"
          :tag-label="t('operators.detail.profile')"
          :title="displayName"
          :subtitle="`${t('operators.classes.' + operatorClass)} // ${operatorSubclass}`"
          :watermark="operatorWatermark"
          :badge="`${operatorRarity}★`"
          badge-variant="amber"
        >
          <template #actions>
            <AkButton variant="ghost" size="sm" :to="localePath('/operators')">
              {{ t('operators.detail.backToList') }}
            </AkButton>
          </template>
        </AkPageHeader>

        <div class="operator-detail-page__content">
          <AkPanel :tag="operatorCode" :title="displayName" variant="bordered">
            <div class="operator-detail-page__profile-card">
              <div class="operator-detail-page__avatar-block">
                <AkAvatar :id="operatorId" :name="displayName" :rarity="operatorRarity" size="lg" />
              </div>

              <div class="operator-detail-page__meta-grid">
                <div class="operator-detail-page__meta-item">
                  <span class="operator-detail-page__meta-label">
                    {{ t('operators.filters.class') }}
                  </span>
                  <span class="operator-detail-page__meta-value">
                    {{ t('operators.classes.' + operatorClass) }}
                  </span>
                </div>

                <div class="operator-detail-page__meta-item">
                  <span class="operator-detail-page__meta-label">
                    {{ t('operators.detail.subclass') }}
                  </span>
                  <span class="operator-detail-page__meta-value">
                    {{ operatorSubclass }}
                  </span>
                </div>

                <div class="operator-detail-page__meta-item">
                  <span class="operator-detail-page__meta-label">
                    {{ t('operators.detail.faction') }}
                  </span>
                  <span class="operator-detail-page__meta-value">
                    {{ operatorFaction ? t('operators.factions.' + operatorFaction) : '—' }}
                  </span>
                </div>

                <div class="operator-detail-page__meta-item">
                  <span class="operator-detail-page__meta-label">
                    {{ t('operators.detail.position') }}
                  </span>
                  <span class="operator-detail-page__meta-value">
                    {{ operatorPosition }}
                  </span>
                </div>

                <div class="operator-detail-page__meta-item">
                  <span class="operator-detail-page__meta-label">
                    {{ t('operators.detail.servers') }}
                  </span>
                  <div class="operator-detail-page__servers-list">
                    <AkBadge
                      v-for="srv in operatorServers"
                      :key="srv"
                      size="sm"
                      :variant="srv === 'global' ? 'cyan' : 'amber'"
                    >
                      {{ srv.toUpperCase() }}
                    </AkBadge>
                  </div>
                </div>
              </div>
            </div>
          </AkPanel>
        </div>
      </template>

      <template v-else>
        <AkAlert variant="danger" :title="t('operators.empty.title')">
          <p>{{ t('operators.empty.description') }}</p>
          <template #actions>
            <AkButton variant="secondary" size="sm" :to="localePath('/operators')">
              {{ t('operators.detail.backToList') }}
            </AkButton>
          </template>
        </AkAlert>
      </template>
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.operator-detail-page {
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

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  &__profile-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;

    @include mq(sm) {
      flex-direction: row;
      align-items: center;
      gap: var(--space-xl);
    }
  }

  &__avatar-block {
    flex-shrink: 0;
  }

  &__meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-sm) var(--space-md);
    flex: 1;
    min-width: 0;

    @include mq(md) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &__meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  &__meta-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-mono);
  }

  &__meta-value {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
  }

  &__servers-list {
    display: flex;
    gap: var(--space-2xs);
  }
}
</style>
