<script setup lang="ts">
import { ref } from 'vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkPanel from '~/components/ui/AkPanel.vue'
import AkTabs, { type TabItem } from '~/components/ui/AkTabs.vue'
import AkInput from '~/components/ui/AkInput.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkStat from '~/components/ui/AkStat.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkProgress from '~/components/ui/AkProgress.vue'
import AkModal from '~/components/ui/AkModal.vue'

const { t } = useI18n()

const sampleTabs: TabItem[] = [
  { id: 'tab1', label: 'SYSTEM ALPHA' },
  { id: 'tab2', label: 'RADAR LOGS' },
  { id: 'tab3', label: 'OFFLINE ARCHIVE', disabled: true },
]
const activeTab = ref('tab1')
const inputValue = ref('')
const inputError = ref('PRTS cryptographic key invalid')
const isModalOpen = ref(false)
</script>

<template>
  <div class="page-ui">
    <div class="page-ui__container">
      <header class="page-ui__header">
        <span class="page-ui__badge">PRTS // DEV SHOWCASE</span>
        <h1 class="page-ui__title">{{ t('ui.title') }}</h1>
        <p class="page-ui__subtitle">{{ t('ui.subtitle') }}</p>
      </header>

      <!-- Buttons -->
      <AkPanel title="AkButton Component" tag="UI // 01" line-color="cyan">
        <div class="page-ui__group">
          <span class="page-ui__group-label">Variants</span>
          <div class="page-ui__row">
            <AkButton variant="primary">Deploy (Primary)</AkButton>
            <AkButton variant="secondary">Radar Scan (Secondary)</AkButton>
            <AkButton variant="ghost">Inspect (Ghost)</AkButton>
            <AkButton variant="danger">Retreat (Danger)</AkButton>
          </div>
        </div>

        <div class="page-ui__group">
          <span class="page-ui__group-label">Sizes & Shapes</span>
          <div class="page-ui__row">
            <AkButton size="sm">Small Unit</AkButton>
            <AkButton size="md">Medium Unit</AkButton>
            <AkButton size="lg">Large Command</AkButton>
            <AkButton :cut-corner="true">Cut Corner</AkButton>
          </div>
        </div>

        <div class="page-ui__group">
          <span class="page-ui__group-label">States</span>
          <div class="page-ui__row">
            <AkButton :disabled="true">Disabled Action</AkButton>
            <AkButton :loading="true">Loading Mission</AkButton>
          </div>
        </div>
      </AkPanel>

      <!-- Badges & Rarities -->
      <AkPanel title="AkBadge & Operator Rarities" tag="UI // 02" line-color="amber">
        <div class="page-ui__group">
          <span class="page-ui__group-label">HUD Variants</span>
          <div class="page-ui__row">
            <AkBadge variant="cyan">CYAN // TECH</AkBadge>
            <AkBadge variant="amber">AMBER // STANDBY</AkBadge>
            <AkBadge variant="green">GREEN // OPTIMAL</AkBadge>
            <AkBadge variant="red">RED // COMBAT</AkBadge>
            <AkBadge variant="neutral">NEUTRAL</AkBadge>
          </div>
        </div>

        <div class="page-ui__group">
          <span class="page-ui__group-label">Operator Rarity Badges (1★ - 6★)</span>
          <div class="page-ui__row">
            <AkBadge variant="rarity" :rarity="1">1★ ROOKIE</AkBadge>
            <AkBadge variant="rarity" :rarity="2">2★ STANDARD</AkBadge>
            <AkBadge variant="rarity" :rarity="3">3★ EXPERIENCED</AkBadge>
            <AkBadge variant="rarity" :rarity="4">4★ VETERAN</AkBadge>
            <AkBadge variant="rarity" :rarity="5">5★ ELITE</AkBadge>
            <AkBadge variant="rarity" :rarity="6">6★ SENIOR EXECUTIVE</AkBadge>
          </div>
        </div>
      </AkPanel>

      <!-- Stats Tiles -->
      <AkPanel title="AkStat Component" tag="UI // 03" line-color="green">
        <div class="page-ui__stats-grid">
          <AkStat label="AVAILABLE PULLS:" value="142 ROLLS" variant="cyan" />
          <AkStat label="ACTIVE TARGETS:" value="4 OPERATORS" variant="neutral" />
          <AkStat label="SPARK READINESS:" value="47%" subvalue="(142/300)" variant="amber" />
          <AkStat label="MONTHLY CARD:" value="ACTIVE (+200/D)" variant="green" />
        </div>
      </AkPanel>

      <!-- Alerts -->
      <AkPanel title="AkAlert Component" tag="UI // 04" line-color="red">
        <div class="page-ui__column">
          <AkAlert variant="warning" title="NO GAME ACCOUNT SYNCHRONIZED" badge="PRTS // STANDBY">
            Depot stock, gacha currency, and operator promotion goals are currently empty.
            <template #actions>
              <AkButton variant="ghost" size="sm">LOAD DEMO</AkButton>
              <AkButton variant="primary" size="sm">SYNC ACCOUNT →</AkButton>
            </template>
          </AkAlert>

          <AkAlert variant="info" title="TERMINAL SYSTEM UPDATE" badge="PRTS // NOTICE">
            PRTS kernel system v4.12 loaded with real-time Penguin Stats sync protocol.
          </AkAlert>

          <AkAlert variant="success" title="PROMOTION PLAN COMPLETED" badge="PRTS // SUCCESS">
            Materials for Blaze the Igniting Spark E2 promotion synthesized successfully.
          </AkAlert>

          <AkAlert variant="danger" title="SECURITY ADVISORY" badge="PRTS // ALERT">
            Cryptographic handshake mismatch detected on auxiliary socket.
          </AkAlert>
        </div>
      </AkPanel>

      <!-- Avatars -->
      <AkPanel title="AkAvatar Component" tag="UI // 05" line-color="cyan">
        <div class="page-ui__group">
          <span class="page-ui__group-label">Operator Rarity Underlines (1★ - 6★)</span>
          <div class="page-ui__row">
            <AkAvatar name="Thermal-EX" :rarity="1" size="md" />
            <AkAvatar name="Yato" :rarity="2" size="md" />
            <AkAvatar name="Kroos" :rarity="3" size="md" />
            <AkAvatar name="Myrtle" :rarity="4" size="md" />
            <AkAvatar name="Amiya" :rarity="5" size="md" />
            <AkAvatar name="Blaze" :rarity="6" size="md" />
          </div>
        </div>

        <div class="page-ui__group">
          <span class="page-ui__group-label">Broken Image Fallback</span>
          <div class="page-ui__row">
            <AkAvatar src="/broken-link.png" name="Doctor" :rarity="6" size="lg" />
            <AkAvatar src="/broken-link.png" name="SilverAsh" :rarity="6" size="md" />
            <AkAvatar src="/broken-link.png" name="Eyjafjalla" :rarity="6" size="sm" />
          </div>
        </div>
      </AkPanel>

      <!-- Progress & Empty State -->
      <AkPanel title="AkProgress & AkEmptyState" tag="UI // 06" line-color="amber">
        <div class="page-ui__column">
          <AkProgress
            :value="142"
            :max="300"
            label="300-SPARK PROGRESS"
            :show-percentage="true"
            variant="cyan"
            :segments="3"
          />

          <AkProgress
            :value="75"
            :max="100"
            label="DEPOT SYNC STATUS"
            :show-percentage="true"
            variant="amber"
            :segments="4"
          />

          <AkEmptyState
            title="NO OPERATOR TARGETS PLANNED YET."
            description="Click an elite operator below to add to promotion plan."
          >
            <template #action>
              <AkButton variant="secondary" size="sm">+ ADD OPERATOR</AkButton>
            </template>
          </AkEmptyState>
        </div>
      </AkPanel>

      <!-- Modal & Inputs -->
      <AkPanel title="AkModal & AkInput" tag="UI // 07" line-color="green">
        <div class="page-ui__column">
          <div class="page-ui__row">
            <AkButton variant="primary" @click="isModalOpen = true">
              Open Interactive AkModal
            </AkButton>
          </div>

          <div class="page-ui__inputs-grid">
            <AkInput
              v-model="inputValue"
              label="OPERATOR IDENTIFIER"
              placeholder="e.g. Blaze the Igniting Spark"
              hint="Search by English or Russian operator name"
            />
            <AkInput
              v-model="inputError"
              label="AUTHENTICATION TOKEN"
              error="PRTS verification failed: Invalid cryptographic key."
            />
          </div>
        </div>
      </AkPanel>

      <!-- Tabs -->
      <AkPanel title="AkTabs Component" tag="UI // 08" line-color="cyan">
        <AkTabs v-model="activeTab" :items="sampleTabs">
          <template #default="{ activeTab: currentTab }">
            <div class="page-ui__tab-panel">
              <p v-if="currentTab === 'tab1'">
                PRTS Terminal Alpha online. Tactical command systems responsive.
              </p>
              <p v-else-if="currentTab === 'tab2'">
                Radar logs updated: Next Standard Headhunting scheduled in 24 days.
              </p>
            </div>
          </template>
        </AkTabs>
      </AkPanel>
    </div>

    <!-- Interactive Showcase Modal -->
    <AkModal
      v-model="isModalOpen"
      title="Tactical Security Override"
      tag="PRTS.SECURITY // CONFIRM"
    >
      <div class="page-ui__modal-inner">
        <AkAlert variant="warning" title="OVERRIDE PROTOCOL ACTIVE">
          Manual override modifies tactical telemetry for simulated missions.
        </AkAlert>
        <p>Confirm authorization credentials before continuing.</p>
      </div>

      <template #footer>
        <AkButton variant="ghost" @click="isModalOpen = false">Cancel</AkButton>
        <AkButton variant="primary" @click="isModalOpen = false">Authorize</AkButton>
      </template>
    </AkModal>
  </div>
</template>

<style lang="scss" scoped>
.page-ui {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;

  @include mq(md) {
    padding: var(--space-xl);
  }

  &__container {
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  &__badge {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-accent-primary);
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-heading);
    color: var(--color-text-primary);
    text-transform: uppercase;
    margin: 0;
  }

  &__subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__group-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
  }

  &__column {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-sm);

    @include mq(sm) {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mq(lg) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__inputs-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);

    @include mq(md) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__tab-panel {
    padding: var(--space-md);
    background-color: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__modal-inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
}
</style>
