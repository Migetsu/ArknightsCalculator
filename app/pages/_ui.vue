<script setup lang="ts">
const { t } = useI18n()

const activeTab = ref('general')
const tabItems = [
  { id: 'general', label: 'General System' },
  { id: 'combat', label: 'Combat Parameters' },
  { id: 'logistics', label: 'Logistics Depot', disabled: true },
]

const textInputValue = ref('Rhodes Island Terminal')
const numberInputValue = ref(120)
const errorInputValue = ref('Invalid Operator ID')
</script>

<template>
  <div class="page-ui">
    <header class="page-ui__header">
      <h1 class="page-ui__title">{{ t('ui.title') }}</h1>
      <p class="page-ui__subtitle">{{ t('ui.subtitle') }}</p>
    </header>

    <!-- Buttons Section -->
    <UiAkPanel :title="t('ui.buttons')" class="page-ui__section">
      <div class="page-ui__group">
        <h3 class="page-ui__group-title">Variants</h3>
        <div class="page-ui__row">
          <UiAkButton variant="primary">Deploy (Primary)</UiAkButton>
          <UiAkButton variant="ghost">Inspect (Ghost)</UiAkButton>
          <UiAkButton variant="danger">Retreat (Danger)</UiAkButton>
        </div>
      </div>

      <div class="page-ui__group">
        <h3 class="page-ui__group-title">Sizes</h3>
        <div class="page-ui__row">
          <UiAkButton size="sm">Small Unit</UiAkButton>
          <UiAkButton size="md">Medium Unit</UiAkButton>
          <UiAkButton size="lg">Large Unit</UiAkButton>
        </div>
      </div>

      <div class="page-ui__group">
        <h3 class="page-ui__group-title">States</h3>
        <div class="page-ui__row">
          <UiAkButton disabled>Disabled Action</UiAkButton>
          <UiAkButton loading>Loading Mission</UiAkButton>
          <UiAkButton :cut-corner="false">Square Corner</UiAkButton>
        </div>
      </div>
    </UiAkPanel>

    <!-- Panels Section -->
    <UiAkPanel :title="t('ui.panels')" class="page-ui__section">
      <div class="page-ui__grid">
        <UiAkPanel title="Alpha Sector" subtitle="Top-left tactical cut" cut-corner="top-left">
          <p>Tactical data stream active. Rhodes Island internal communication online.</p>
        </UiAkPanel>

        <UiAkPanel title="Beta Sector" subtitle="Top-right tactical cut" cut-corner="top-right">
          <p>Depot storage units cataloged. Orirock extraction in progress.</p>
        </UiAkPanel>
      </div>
    </UiAkPanel>

    <!-- Tabs Section -->
    <UiAkPanel :title="t('ui.tabs')" class="page-ui__section">
      <UiAkTabs v-model="activeTab" :items="tabItems" aria-label="Showcase Tabs">
        <div v-if="activeTab === 'general'" class="page-ui__tab-panel">
          <p>PRTS Operational OS online. Terminal status: NORMAL.</p>
        </div>
        <div v-else-if="activeTab === 'combat'" class="page-ui__tab-panel">
          <p>Combat parameters loaded. Squad leader ready for mission deployment.</p>
        </div>
      </UiAkTabs>
    </UiAkPanel>

    <!-- Inputs Section -->
    <UiAkPanel :title="t('ui.inputs')" class="page-ui__section">
      <div class="page-ui__grid">
        <UiAkInput
          v-model="textInputValue"
          label="Terminal Host"
          placeholder="Enter host name..."
        />

        <UiAkInput
          v-model="numberInputValue"
          label="Sanity Capacity"
          type="number"
          placeholder="135"
        />

        <UiAkInput
          v-model="errorInputValue"
          label="Authentication Token"
          error="PRTS verification failed: Invalid cryptographic key."
        />

        <UiAkInput model-value="Read-only Clearance Level 5" label="Security Clearance" disabled />
      </div>
    </UiAkPanel>
  </div>
</template>

<style lang="scss" scoped>
.page-ui {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  padding: var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;

  &__header {
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: var(--space-md);
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 var(--space-2xs);
  }

  &__subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
  }

  &__group-title {
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    align-items: center;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);

    @include mq(md) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__tab-panel {
    padding: var(--space-md);
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-subtle);
  }
}
</style>
