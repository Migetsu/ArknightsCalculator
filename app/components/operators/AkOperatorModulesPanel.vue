<script setup lang="ts">
import { ref } from 'vue'
import type { OperatorModule } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import AkRichText from '~/components/ui/AkRichText.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkModuleIcon from '~/components/ui/AkModuleIcon.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'

interface Props {
  modules: OperatorModule[]
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

// Track active stage per module (1..3)
const activeStages = ref<Record<string, number>>(
  Object.fromEntries(props.modules.map((m) => [m.id, Math.max(1, m.stages?.length ?? 1)])),
)

function getModuleName(m: OperatorModule): string {
  return resolveI18nString(m.name, locale.value as 'en' | 'ru' | 'zh') || m.name?.en || m.type
}

function getStageStats(m: OperatorModule, stageNum: number): Record<string, number> {
  const stage = (m.stages ?? []).find((s) => s.stage === stageNum)
  return stage?.stats ?? {}
}

function getStageParts(m: OperatorModule, stageNum: number) {
  const stage = (m.stages ?? []).find((s) => s.stage === stageNum)
  return stage?.parts ?? []
}

function getStageCost(m: OperatorModule, stageNum: number) {
  const stage = (m.stages ?? []).find((s) => s.stage === stageNum)
  if (stage?.cost && stage.cost.length > 0) return stage.cost
  return m.itemCost?.[stageNum.toString()] ?? []
}
</script>

<template>
  <div class="ak-operator-modules-panel">
    <div v-if="modules.length === 0" class="ak-operator-modules-panel__empty">
      {{ t('operators.detail.modules.noModules') }}
    </div>

    <div v-for="mod in modules" :key="mod.id" class="ak-operator-modules-panel__module-card">
      <!-- Header -->
      <div class="ak-operator-modules-panel__header">
        <AkModuleIcon
          :module-id="mod.id"
          :type-name="mod.type"
          :name="getModuleName(mod)"
          size="lg"
        />

        <div class="ak-operator-modules-panel__info">
          <div class="ak-operator-modules-panel__title-row">
            <h4 class="ak-operator-modules-panel__title">
              {{ getModuleName(mod) }}
              <AkTranslationBadge
                v-if="mod.name?.source === 'machine' || mod.name?.stale"
                :source="mod.name?.source"
                :stale="mod.name?.stale"
              />
            </h4>
            <AkBadge size="sm" variant="cyan">{{ mod.type }}</AkBadge>
          </div>
          <span class="ak-operator-modules-panel__code">{{ mod.id }}</span>
        </div>
      </div>

      <!-- Stage Switcher (1..3) -->
      <div v-if="(mod.stages?.length ?? 0) > 0" class="ak-operator-modules-panel__stages-bar">
        <AkButton
          v-for="st in mod.stages"
          :key="st.stage"
          size="sm"
          :variant="activeStages[mod.id] === st.stage ? 'secondary' : 'ghost'"
          @click="activeStages[mod.id] = st.stage"
        >
          {{ t('operators.detail.modules.stage', { stage: st.stage }) }}
        </AkButton>
      </div>

      <!-- Active Stage Stat Modifiers -->
      <div
        v-if="Object.keys(getStageStats(mod, activeStages[mod.id] ?? 1)).length > 0"
        class="ak-operator-modules-panel__stats-list"
      >
        <span class="ak-operator-modules-panel__sub-title">
          {{ t('operators.detail.modules.attributes') }}:
        </span>
        <div class="ak-operator-modules-panel__stats-chips">
          <span
            v-for="(val, statKey) in getStageStats(mod, activeStages[mod.id] ?? 1)"
            :key="statKey"
            class="ak-operator-modules-panel__stat-chip"
          >
            {{ statKey.toUpperCase() }}: +{{ val }}
          </span>
        </div>
      </div>

      <!-- Trait and Talent Upgrades (Parts) -->
      <div
        v-for="(part, pIdx) in getStageParts(mod, activeStages[mod.id] ?? 1)"
        :key="pIdx"
        class="ak-operator-modules-panel__part-block"
      >
        <div v-if="part.candidates?.length" class="ak-operator-modules-panel__part-item">
          <span class="ak-operator-modules-panel__part-title">
            {{
              part.target === 'TRAIT'
                ? t('operators.detail.modules.traitUpgrade')
                : t('operators.detail.modules.talentUpgrade')
            }}
          </span>
          <div
            v-for="(cand, cIdx) in part.candidates"
            :key="cIdx"
            class="ak-operator-modules-panel__part-desc"
          >
            <AkRichText
              :raw-text="
                (cand.upgradeDescription &&
                  resolveI18nString(cand.upgradeDescription, locale as 'en' | 'ru' | 'zh')) ||
                (cand.additionalDescription &&
                  resolveI18nString(cand.additionalDescription, locale as 'en' | 'ru' | 'zh')) ||
                (cand.overrideDescription &&
                  resolveI18nString(cand.overrideDescription, locale as 'en' | 'ru' | 'zh')) ||
                cand.upgradeDescription?.en ||
                cand.additionalDescription?.en ||
                ''
              "
              :blackboard="cand.blackboard ?? {}"
            />
          </div>
        </div>
      </div>

      <!-- Stage Upgrade Materials -->
      <div
        v-if="getStageCost(mod, activeStages[mod.id] ?? 1).length > 0"
        class="ak-operator-modules-panel__cost-section"
      >
        <span class="ak-operator-modules-panel__sub-title">
          {{ t('operators.detail.modules.materials') }}:
        </span>
        <div class="ak-operator-modules-panel__cost-list">
          <AkItemIcon
            v-for="item in getStageCost(mod, activeStages[mod.id] ?? 1)"
            :key="item.id"
            :item-id="item.id"
            :name="item.id"
            :count="item.count"
            size="sm"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-modules-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);

  &__empty {
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    padding: var(--space-md);
  }

  &__module-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__code {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__stages-bar {
    display: flex;
    gap: var(--space-xs);
    background: var(--color-bg-base);
    padding: var(--space-xs);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    flex-wrap: wrap;
  }

  &__sub-title {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &__stats-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__stats-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  &__stat-chip {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-accent-amber);
    background: var(--color-bg-base);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: 2px var(--space-xs);
  }

  &__part-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__part-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__part-title {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent-amber);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &__part-desc {
    background: var(--color-bg-base);
    border-left: 3px solid var(--color-accent-amber);
    border-radius: var(--radius-xs);
    padding: var(--space-sm) var(--space-md);
  }

  &__cost-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__cost-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
}
</style>
