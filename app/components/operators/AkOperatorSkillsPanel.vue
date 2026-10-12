<script setup lang="ts">
import { ref } from 'vue'
import type { OperatorSkill } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import { resolveAsset } from '~/../shared/utils/resolveAsset'
import AkRichText from '~/components/ui/AkRichText.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkIcon from '~/components/ui/AkIcon.vue'

interface Props {
  skills: OperatorSkill[]
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

// Track chosen level per skill (default: max level/mastery)
const selectedLevels = ref<Record<string, number>>(
  Object.fromEntries(props.skills.map((s) => [s.skillId, Math.max(1, s.levels.length)])),
)

function getSkillName(skill: OperatorSkill, lvlIndex: number): string {
  const lvlData = skill.levels[lvlIndex]
  if (!lvlData) return skill.skillId
  return resolveI18nString(lvlData.name, locale.value as 'en' | 'ru' | 'zh') || lvlData.name.en
}

function getSkillDesc(skill: OperatorSkill, lvlIndex: number): string {
  const lvlData = skill.levels[lvlIndex]
  if (!lvlData) return ''
  return (
    resolveI18nString(lvlData.description, locale.value as 'en' | 'ru' | 'zh') ||
    lvlData.description?.en ||
    ''
  )
}

function getSkillBlackboard(skill: OperatorSkill, lvlIndex: number): Record<string, number> {
  const lvlData = skill.levels[lvlIndex]
  return lvlData?.blackboard ?? {}
}

function getSkillIconUrl(skill: OperatorSkill): string | null {
  const iconId = skill.iconId || skill.skillId
  const urls = resolveAsset('skill', iconId)
  return urls[0] ?? null
}

function getLevelLabel(idx: number): string {
  if (idx <= 7) return `Lv ${idx}`
  return `M${idx - 7}`
}
</script>

<template>
  <div class="ak-operator-skills-panel">
    <div v-if="skills.length === 0" class="ak-operator-skills-panel__empty">
      {{ t('operators.detail.skills.noSkills') }}
    </div>

    <div v-for="skill in skills" :key="skill.skillId" class="ak-operator-skills-panel__skill-card">
      <!-- Skill Header -->
      <div class="ak-operator-skills-panel__header">
        <div class="ak-operator-skills-panel__icon-box">
          <img
            v-if="getSkillIconUrl(skill)"
            :src="getSkillIconUrl(skill)!"
            :alt="skill.skillId"
            class="ak-operator-skills-panel__icon"
            loading="lazy"
            decoding="async"
          />
          <AkIcon v-else name="lucide:zap" size="lg" />
        </div>

        <div class="ak-operator-skills-panel__info">
          <h4 class="ak-operator-skills-panel__title">
            {{ getSkillName(skill, (selectedLevels[skill.skillId] ?? 1) - 1) }}
          </h4>
          <div class="ak-operator-skills-panel__badges">
            <AkBadge size="sm" variant="cyan">
              {{ t('operators.detail.skills.spTypes.' + (skill.levels[0]?.spType ?? 'PASSIVE')) }}
            </AkBadge>
            <AkBadge size="sm" variant="amber">
              {{ skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.skillType ?? 'MANUAL' }}
            </AkBadge>
          </div>
        </div>
      </div>

      <!-- Skill Level Selector (1..7, M1..M3) -->
      <div class="ak-operator-skills-panel__levels-bar">
        <AkButton
          v-for="lvl in skill.levels.length"
          :key="lvl"
          size="sm"
          :variant="
            selectedLevels[skill.skillId] === lvl ? (lvl > 7 ? 'secondary' : 'primary') : 'ghost'
          "
          class="ak-operator-skills-panel__lvl-btn"
          @click="selectedLevels[skill.skillId] = lvl"
        >
          {{ getLevelLabel(lvl) }}
        </AkButton>
      </div>

      <!-- SP & Duration Telemetry -->
      <div class="ak-operator-skills-panel__telemetry">
        <div class="ak-operator-skills-panel__telemetry-item">
          <span class="ak-operator-skills-panel__telemetry-label">
            {{ t('operators.detail.skills.spCost') }}:
          </span>
          <span class="ak-operator-skills-panel__telemetry-val">
            {{ skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.spCost ?? 0 }}
          </span>
        </div>
        <div class="ak-operator-skills-panel__telemetry-item">
          <span class="ak-operator-skills-panel__telemetry-label">
            {{ t('operators.detail.skills.initialSp') }}:
          </span>
          <span class="ak-operator-skills-panel__telemetry-val">
            {{ skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.initSp ?? 0 }}
          </span>
        </div>
        <div
          v-if="skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.duration"
          class="ak-operator-skills-panel__telemetry-item"
        >
          <span class="ak-operator-skills-panel__telemetry-label">
            {{ t('operators.detail.skills.duration') }}:
          </span>
          <span class="ak-operator-skills-panel__telemetry-val">
            {{ skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.duration }}s
          </span>
        </div>
      </div>

      <!-- Description using AkRichText -->
      <div class="ak-operator-skills-panel__desc">
        <AkRichText
          :raw-text="getSkillDesc(skill, (selectedLevels[skill.skillId] ?? 1) - 1)"
          :blackboard="getSkillBlackboard(skill, (selectedLevels[skill.skillId] ?? 1) - 1)"
        />
      </div>

      <!-- Upgrade Cost Materials (Masteries 8..10 / M1..M3) -->
      <div
        v-if="
          (selectedLevels[skill.skillId] ?? 1) > 7 &&
          skill.masteryCosts?.[(selectedLevels[skill.skillId] ?? 1) - 8]?.levelUpCost?.length
        "
        class="ak-operator-skills-panel__cost-section"
      >
        <span class="ak-operator-skills-panel__cost-title">
          {{ t('operators.detail.skills.materials') }}:
        </span>
        <div class="ak-operator-skills-panel__cost-list">
          <div
            v-for="item in skill.masteryCosts[(selectedLevels[skill.skillId] ?? 1) - 8]!
              .levelUpCost"
            :key="item.id"
            class="ak-operator-skills-panel__cost-item"
          >
            <img
              :src="resolveAsset('item', item.id)[0]"
              :alt="item.id"
              class="ak-operator-skills-panel__cost-icon"
              loading="lazy"
              decoding="async"
            />
            <span class="ak-operator-skills-panel__cost-count">x{{ item.count }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-skills-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);

  &__empty {
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    padding: var(--space-md);
  }

  &__skill-card {
    background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%);
    border: 1px solid var(--color-border-bold);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);

    @include cut-corner(8px, top-right);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  &__icon-box {
    width: 52px;
    height: 52px;
    background: var(--color-bg-base);
    border: 1px solid var(--color-border-bold);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    @include cut-corner(4px, top-right);
  }

  &__icon {
    width: 48px;
    height: 48px;
    object-fit: contain;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__badges {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__levels-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    background: var(--color-bg-base);
    padding: var(--space-xs);
    border: 1px solid var(--color-border-bold);

    @include cut-corner(4px, top-right);
  }

  &__lvl-btn {
    min-width: 44px;
    font-family: var(--font-mono);
  }

  &__telemetry {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  &__telemetry-item {
    display: flex;
    gap: var(--space-xs);
  }

  &__telemetry-label {
    color: var(--color-text-secondary);
  }

  &__telemetry-val {
    color: var(--color-accent-primary);
    font-weight: var(--font-weight-bold);
    text-shadow: 0 0 6px var(--color-accent-primary-glow);
  }

  &__desc {
    background: var(--color-bg-base);
    border-left: 3px solid var(--color-accent-primary);
    padding: var(--space-sm) var(--space-md);
    line-height: var(--line-height-relaxed);

    @include cut-corner(4px, top-right);
  }

  &__cost-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    font-family: var(--font-mono);
  }

  &__cost-title {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__cost-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  &__cost-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: var(--color-bg-base);
    border: 1px solid var(--color-border-bold);
    padding: 2px var(--space-sm);

    @include cut-corner(4px, top-right);
  }

  &__cost-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  &__cost-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-primary);
  }
}
</style>
