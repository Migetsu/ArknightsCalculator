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
import AkContainer from '~/components/ui/AkContainer.vue'
import AkGrid from '~/components/ui/AkGrid.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkChip from '~/components/ui/AkChip.vue'
import AkSegmented, { type SegmentOption } from '~/components/ui/AkSegmented.vue'
import AkStepper from '~/components/ui/AkStepper.vue'

const { t } = useI18n()

const sampleTabs: TabItem[] = [
  { id: 'tab1', label: 'SYSTEM ALPHA' },
  { id: 'tab2', label: 'RADAR LOGS' },
  { id: 'tab3', label: 'OFFLINE ARCHIVE', disabled: true },
]
const activeTab = ref('tab1')
const activeUnderlineTab = ref('tab1')

const inputValue = ref('')
const inputError = ref('PRTS cryptographic key invalid')
const isModalOpen = ref(false)

// AkChip & AkSegmented demo states
const chipActive1 = ref(true)
const chipActive2 = ref(false)
const chipActive3 = ref(true)

const serverOptions: SegmentOption[] = [
  { value: 'global', label: 'Global' },
  { value: 'cn', label: 'CN' },
]
const selectedServer = ref('global')

const langOptions: SegmentOption[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
]
const selectedLang = ref('en')

// AkStepper demo state
const stepperCount = ref(42)
const stepperLmd = ref(150000)
</script>

<template>
  <div class="page-ui">
    <AkContainer size="lg" class="page-ui__container">
      <AkPageHeader
        code="UI-00"
        tag-label="DEV SHOWCASE"
        :title="t('ui.title')"
        :subtitle="t('ui.subtitle')"
        watermark="ARKCALC"
        badge="DEV-ONLY"
        badge-variant="amber"
      >
        <template #title>
          <span class="page-ui__title">{{ t('ui.title') }}</span>
        </template>
        <template #actions>
          <AkButton variant="outline" size="sm" @click="isModalOpen = true">
            Launch Modal
          </AkButton>
        </template>
      </AkPageHeader>

      <!-- Buttons (Ember Editorial) -->
      <AkPanel title="AkButton Component" tag="UI // 01" line-color="ember">
        <div class="page-ui__group">
          <span class="page-ui__group-label">Ember Editorial Variants</span>
          <div class="page-ui__row">
            <AkButton variant="primary">Sync account (Primary Ember)</AkButton>
            <AkButton variant="outline">Load demo data (Outline)</AkButton>
            <AkButton variant="gold-outline">Export backup (Gold Outline)</AkButton>
            <AkButton variant="danger">Reset data (Danger)</AkButton>
            <AkButton variant="ghost">Settings (Ghost)</AkButton>
          </div>
        </div>

        <div class="page-ui__group">
          <span class="page-ui__group-label">Sizes</span>
          <div class="page-ui__row">
            <AkButton size="sm">Small Unit (sm)</AkButton>
            <AkButton size="md">Medium Action (md)</AkButton>
            <AkButton size="lg">Large Command (lg)</AkButton>
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

      <!-- AkChip, AkSegmented, AkStepper (New Primitives) -->
      <AkPanel title="AkChip, AkSegmented & AkStepper" tag="UI // 02" line-color="ember">
        <div class="page-ui__group">
          <span class="page-ui__group-label">AkChip: Toggleable Filters & Tags</span>
          <div class="page-ui__row">
            <AkChip v-model="chipActive1">All classes</AkChip>
            <AkChip v-model="chipActive2">Guard</AkChip>
            <AkChip v-model="chipActive3">Caster</AkChip>
            <AkChip :disabled="true">Medic (Disabled)</AkChip>
          </div>
        </div>

        <div class="page-ui__group">
          <span class="page-ui__group-label">AkSegmented: Server / Language Switchers</span>
          <div class="page-ui__row">
            <AkSegmented v-model="selectedServer" :options="serverOptions" />
            <AkSegmented v-model="selectedLang" :options="langOptions" />
          </div>
        </div>

        <div class="page-ui__group">
          <span class="page-ui__group-label">AkStepper: Inventory Number Controls</span>
          <div class="page-ui__row">
            <div class="page-ui__stepper-demo">
              <span class="page-ui__stepper-label">Item Quantity:</span>
              <AkStepper v-model="stepperCount" :min="0" :max="999" />
            </div>
            <div class="page-ui__stepper-demo">
              <span class="page-ui__stepper-label">LMD Stock:</span>
              <AkStepper v-model="stepperLmd" :min="0" :max="9999999" :step="1000" />
            </div>
            <div class="page-ui__stepper-demo">
              <span class="page-ui__stepper-label">Disabled:</span>
              <AkStepper :model-value="10" :disabled="true" />
            </div>
          </div>
        </div>
      </AkPanel>

      <!-- Badges & Rarities -->
      <AkPanel title="AkBadge & Operator Rarities" tag="UI // 03" line-color="amber">
        <div class="page-ui__group">
          <span class="page-ui__group-label">HUD Variants</span>
          <div class="page-ui__row">
            <AkBadge variant="amber">AMBER // STANDBY</AkBadge>
            <AkBadge variant="green">GREEN // OPTIMAL</AkBadge>
            <AkBadge variant="red">RED // COMBAT</AkBadge>
            <AkBadge variant="cyan">CYAN // INFO</AkBadge>
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

      <!-- Stats Tiles (Unbounded 800) -->
      <AkPanel title="AkStat Component (32px Unbounded)" tag="UI // 04" line-color="green">
        <div class="page-ui__stats-grid">
          <AkStat label="PULLS" value="142" variant="ember" />
          <AkStat label="SPARK" value="142 / 300" variant="neutral" />
          <AkStat label="ACTIVE PLANS" value="4" variant="amber" />
          <AkStat label="SERVER" value="Global" variant="green" />
        </div>
      </AkPanel>

      <!-- Alerts -->
      <AkPanel title="AkAlert Component" tag="UI // 05" line-color="amber">
        <div class="page-ui__column">
          <AkAlert variant="warning" title="Unofficial login." badge="TERMINAL // SYNC">
            This uses the game's login servers and is not endorsed by Yostar; use it at your own
            risk. Logging in here may sign you out of the game on your device.
            <template #actions>
              <AkButton variant="outline" size="sm">Learn more</AkButton>
              <AkButton variant="primary" size="sm">Start sync</AkButton>
            </template>
          </AkAlert>

          <AkAlert variant="info" title="TERMINAL SYSTEM UPDATE" badge="TERMINAL // NOTICE">
            PRTS kernel system v4.12 loaded with real-time Penguin Stats sync protocol.
          </AkAlert>

          <AkAlert variant="success" title="PROMOTION PLAN COMPLETED" badge="TERMINAL // SUCCESS">
            Materials for Blaze the Igniting Spark E2 promotion synthesized successfully.
          </AkAlert>

          <AkAlert variant="danger" title="SECURITY ADVISORY" badge="TERMINAL // ALERT">
            Cryptographic handshake mismatch detected on auxiliary socket.
          </AkAlert>
        </div>
      </AkPanel>

      <!-- Avatars -->
      <AkPanel title="AkAvatar Component" tag="UI // 06" line-color="ember">
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
          <span class="page-ui__group-label">Initials Fallback (When Art Unavailable)</span>
          <div class="page-ui__row">
            <AkAvatar name="Doctor" :rarity="6" size="lg" />
            <AkAvatar name="SilverAsh" :rarity="6" size="md" />
            <AkAvatar name="Eyjafjalla" :rarity="6" size="sm" />
          </div>
        </div>
      </AkPanel>

      <!-- Progress & Empty State -->
      <AkPanel title="AkProgress & AkEmptyState" tag="UI // 07" line-color="amber">
        <div class="page-ui__column">
          <AkProgress
            :value="142"
            :max="300"
            label="SPARK PROGRESS"
            :show-percentage="true"
            variant="ember"
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
            title="No plans yet."
            description="Pick an operator to start planning promotion requirements and farming runs."
          >
            <template #action>
              <AkButton variant="outline" size="sm">+ Add operator</AkButton>
            </template>
          </AkEmptyState>
        </div>
      </AkPanel>

      <!-- Modal & Inputs -->
      <AkPanel title="AkModal & AkInput" tag="UI // 08" line-color="green">
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

      <!-- Tabs (Buttons & Underline) -->
      <AkPanel title="AkTabs Component" tag="UI // 09" line-color="ember">
        <div class="page-ui__group">
          <span class="page-ui__group-label">Variant: Buttons</span>
          <AkTabs v-model="activeTab" :items="sampleTabs" variant="buttons">
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
        </div>

        <div class="page-ui__group">
          <span class="page-ui__group-label">Variant: Underline</span>
          <AkTabs v-model="activeUnderlineTab" :items="sampleTabs" variant="underline">
            <template #default="{ activeTab: currentTab }">
              <div class="page-ui__tab-panel">
                <p v-if="currentTab === 'tab1'">Underline tab 1 active.</p>
                <p v-else-if="currentTab === 'tab2'">Underline tab 2 active.</p>
              </div>
            </template>
          </AkTabs>
        </div>
      </AkPanel>

      <!-- Layout Primitives -->
      <AkPanel
        title="Layout Primitives (AkContainer, AkGrid, AkPageHeader)"
        tag="UI // 10"
        line-color="green"
      >
        <div class="page-ui__group">
          <span class="page-ui__group-label">
            AkGrid: Preset Panels (1 col mobile, 2 col md, 3 col xl)
          </span>
          <AkGrid preset="panels">
            <AkPanel title="Module Grid Card 1" tag="DEMO // 01" line-color="ember">
              <p>Responsive content card automatically constrained with minmax(0, 1fr).</p>
            </AkPanel>
            <AkPanel title="Module Grid Card 2" tag="DEMO // 02" line-color="amber">
              <p>Guaranteed zero horizontal overflow across 360px up to 1920px.</p>
            </AkPanel>
            <AkPanel title="Module Grid Card 3" tag="DEMO // 03" line-color="green">
              <p>Adheres strictly to Rhodes Island tactical UI guidelines.</p>
            </AkPanel>
          </AkGrid>
        </div>

        <div class="page-ui__group">
          <span class="page-ui__group-label">AkGrid: Preset Stats (4 columns with minmax)</span>
          <AkGrid preset="stats">
            <AkStat label="DEPLOYED OPERATORS" value="48" variant="ember" />
            <AkStat label="ORUNDUM RESERVE" value="73,200" variant="amber" />
            <AkStat label="MASTERY TARGETS" value="12" variant="green" />
            <AkStat label="SYSTEM TELEMETRY" value="OPTIMAL" variant="neutral" />
          </AkGrid>
        </div>
      </AkPanel>

      <!-- Rich Text Formatting -->
      <AkPanel title="AkRichText Component" tag="UI // 11" line-color="ember">
        <div class="page-ui__column">
          <div class="page-ui__group">
            <span class="page-ui__group-label"
              >Skill Description with Blackboard & Highlights:</span
            >
            <AkPanel variant="bordered">
              <AkRichText
                text="Deals <@ba.vup>{atk_scale:0%}</> physical damage to up to <@ba.vup>{max_target}</> targets. Target suffers <@ba.vdown>-{def:0%}</> DEF."
                :blackboard="{ atk_scale: 2.3, max_target: 3, def: 0.25 }"
                as="div"
              />
            </AkPanel>
          </div>

          <div class="page-ui__group">
            <span class="page-ui__group-label"
              >Interactive Terminology Tooltips (Click/Focus to Inspect):</span
            >
            <AkPanel variant="bordered">
              <AkRichText
                text="<@ba.rem>Automatically activated; Amiya is <$ba.stun>Stunned</> for {stun} seconds after skill ends. Enemies in range suffer <$ba.sleep>Sleep</> and <$ba.sluggish>Slow</>.</>"
                :blackboard="{ stun: 10 }"
                as="div"
              />
            </AkPanel>
          </div>

          <div class="page-ui__group">
            <span class="page-ui__group-label">Nested Tags & Keywords:</span>
            <AkPanel variant="bordered">
              <AkRichText
                text="<@ba.kw>Overdrive</>: ATK increases to <@ba.vup>+{atk:0%}</> and attack speed <@ba.talpu>+{aspd}</>. Switches to <Substitute> mode."
                :blackboard="{ atk: 1.1, aspd: 35 }"
                as="div"
              />
            </AkPanel>
          </div>
        </div>
      </AkPanel>
    </AkContainer>

    <!-- Interactive Showcase Modal -->
    <AkModal v-model="isModalOpen" title="Account synchronization" tag="TERMINAL // SYNC">
      <div class="page-ui__modal-inner">
        <AkAlert variant="warning" title="Unofficial login.">
          This uses the game's login servers and is not endorsed by Yostar; use it at your own risk.
        </AkAlert>
        <p>
          Your email, code and tokens are not stored on our servers. Data stays in this browser.
        </p>
      </div>

      <template #footer>
        <AkButton variant="outline" @click="isModalOpen = false">Cancel</AkButton>
        <AkButton variant="primary" @click="isModalOpen = false">Start sync</AkButton>
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
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    color: var(--color-accent-primary);
  }

  &__title {
    font-family: var(--font-display);
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
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
  }

  &__stepper-demo {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__stepper-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
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
    background-color: var(--color-bg-deep);
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
