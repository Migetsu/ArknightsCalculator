<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { parseRichText, type RichTextNode } from '~/../shared/utils/richText'
import constantsData from '~/../data/constants.json'

interface Props {
  /** Raw description string containing pseudo tags or plain text */
  text?: string | null
  /** Pre-parsed AST nodes array (if already parsed) */
  nodes?: RichTextNode[]
  /** Blackboard dictionary for skill or module stage numbers */
  blackboard?: Record<string, number>
  /** Render wrapper element ('span' or 'div') */
  as?: 'span' | 'div'
  /** Locale for term descriptions ('en' | 'ru' | 'zh') */
  locale?: 'en' | 'ru' | 'zh'
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  nodes: undefined,
  blackboard: undefined,
  as: 'span',
  locale: 'en',
})

const { locale: i18nLocale } = useI18n()

const effectiveLocale = computed<'en' | 'ru' | 'zh'>(() => {
  if (props.locale) return props.locale
  const cur = String(i18nLocale.value)
  if (cur === 'ru' || cur === 'zh') return cur
  return 'en'
})

const parsedNodes = computed<RichTextNode[]>(() => {
  if (props.nodes && props.nodes.length > 0) {
    return props.nodes
  }
  return parseRichText(props.text, {
    blackboard: props.blackboard,
    terms: constantsData.terms,
    locale: effectiveLocale.value,
  })
})

const isPending = computed(() => {
  return props.text?.trim() === '[Pending Translation]'
})

// Popover state for active term tooltip
const activeTermId = ref<string | null>(null)
const rootRef = ref<HTMLElement | null>(null)

function toggleTerm(termId: string) {
  activeTermId.value = activeTermId.value === termId ? null : termId
}

function closeTerm() {
  activeTermId.value = null
}

function handleKeyDown(event: KeyboardEvent, termId: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleTerm(termId)
  } else if (event.key === 'Escape' && activeTermId.value) {
    event.preventDefault()
    closeTerm()
  }
}

function handleClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    closeTerm()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function getHighlightClass(tag: string): string {
  const clean = tag.replace(/^@/, '')
  switch (clean) {
    case 'ba.vup':
      return 'ak-rich-text__highlight--vup'
    case 'ba.vdown':
      return 'ak-rich-text__highlight--vdown'
    case 'ba.rem':
      return 'ak-rich-text__highlight--rem'
    case 'ba.talpu':
      return 'ak-rich-text__highlight--talpu'
    case 'ba.kw':
      return 'ak-rich-text__highlight--kw'
    default:
      return 'ak-rich-text__highlight--default'
  }
}
</script>

<template>
  <component
    :is="as"
    ref="rootRef"
    class="ak-rich-text"
    :class="{ 'ak-rich-text--pending': isPending }"
  >
    <template v-for="(node, index) in parsedNodes" :key="index">
      <!-- 1. Text node -->
      <template v-if="node.type === 'text'">{{ node.text }}</template>

      <!-- 2. Line break node -->
      <br v-else-if="node.type === 'break'" class="ak-rich-text__break" />

      <!-- 3. Highlight node -->
      <span
        v-else-if="node.type === 'highlight'"
        class="ak-rich-text__highlight"
        :class="getHighlightClass(node.tag)"
      >
        <template v-for="(child, cIdx) in node.children" :key="cIdx">
          <template v-if="child.type === 'text'">{{ child.text }}</template>
          <br v-else-if="child.type === 'break'" class="ak-rich-text__break" />
          <span
            v-else-if="child.type === 'highlight'"
            class="ak-rich-text__highlight"
            :class="getHighlightClass(child.tag)"
          >
            <template v-for="(subChild, scIdx) in child.children" :key="scIdx">
              <template v-if="subChild.type === 'text'">{{ subChild.text }}</template>
              <br v-else-if="subChild.type === 'break'" class="ak-rich-text__break" />
            </template>
          </span>
          <!-- Term inside highlight -->
          <span
            v-else-if="child.type === 'term'"
            class="ak-rich-text__term"
            :class="{ 'ak-rich-text__term--active': activeTermId === `${index}-${cIdx}` }"
            role="button"
            tabindex="0"
            :aria-expanded="activeTermId === `${index}-${cIdx}`"
            :aria-label="child.termName || child.termId"
            @click.stop="toggleTerm(`${index}-${cIdx}`)"
            @keydown="handleKeyDown($event, `${index}-${cIdx}`)"
          >
            <span class="ak-rich-text__term-label">
              <template v-for="(termChild, tcIdx) in child.children" :key="tcIdx">
                {{ termChild.type === 'text' ? termChild.text : '' }}
              </template>
            </span>
            <span
              v-if="child.description && activeTermId === `${index}-${cIdx}`"
              class="ak-rich-text__term-popover"
              role="tooltip"
            >
              <strong class="ak-rich-text__term-title">{{ child.termName || child.termId }}</strong>
              <span class="ak-rich-text__term-desc">{{ child.description }}</span>
            </span>
          </span>
        </template>
      </span>

      <!-- 4. Term node -->
      <span
        v-else-if="node.type === 'term'"
        class="ak-rich-text__term"
        :class="{ 'ak-rich-text__term--active': activeTermId === String(index) }"
        role="button"
        tabindex="0"
        :aria-expanded="activeTermId === String(index)"
        :aria-label="node.termName || node.termId"
        @click.stop="toggleTerm(String(index))"
        @keydown="handleKeyDown($event, String(index))"
      >
        <span class="ak-rich-text__term-label">
          <template v-for="(child, tcIdx) in node.children" :key="tcIdx">
            <template v-if="child.type === 'text'">{{ child.text }}</template>
            <span
              v-else-if="child.type === 'highlight'"
              class="ak-rich-text__highlight"
              :class="getHighlightClass(child.tag)"
            >
              <template v-for="(subChild, scIdx) in child.children" :key="scIdx">
                {{ subChild.type === 'text' ? subChild.text : '' }}
              </template>
            </span>
          </template>
        </span>
        <span
          v-if="node.description && activeTermId === String(index)"
          class="ak-rich-text__term-popover"
          role="tooltip"
        >
          <strong class="ak-rich-text__term-title">{{ node.termName || node.termId }}</strong>
          <span class="ak-rich-text__term-desc">{{ node.description }}</span>
        </span>
      </span>
    </template>
  </component>
</template>

<style lang="scss" scoped>
.ak-rich-text {
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-secondary);
  overflow-wrap: break-word;

  &--pending {
    font-style: italic;
    color: var(--color-text-muted);
    opacity: 0.85;
  }

  &__break {
    display: block;
    content: '';
    margin-top: var(--space-2xs);
  }

  &__highlight {
    font-weight: var(--font-weight-semibold);

    &--vup {
      color: var(--color-accent-primary); // Cyan (#00e5ff)
    }

    &--vdown {
      color: var(--color-accent-danger); // Tactical Red (#ff1744)
    }

    &--rem {
      color: var(--color-accent-warning); // Tactical Amber (#ff9800)
    }

    &--talpu {
      color: var(--color-accent-success); // Tactical Green (#00e676)
    }

    &--kw {
      color: var(--color-rarity-5); // Golden Accent (#ffab00)
    }

    &--default {
      color: var(--color-text-primary);
    }
  }

  &__term {
    position: relative;
    display: inline-block;
    cursor: pointer;
    color: var(--color-text-primary);
    border-bottom: 1px dotted var(--color-accent-primary);
    padding: 0 0.125rem;
    transition: background-color var(--transition-fast);

    &:hover,
    &:focus-visible,
    &--active {
      background-color: var(--color-accent-primary-subtle);
      border-bottom-style: solid;
      outline: none;
    }

    &:focus-visible {
      @include focus-ring;
    }
  }

  &__term-label {
    display: inline;
  }

  &__term-popover {
    position: absolute;
    bottom: calc(100% + var(--space-2xs));
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-popover);
    width: max-content;
    max-width: 280px;
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--color-bg-overlay);
    border: 1px solid var(--color-accent-primary);
    box-shadow: var(--shadow-modal);
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    font-size: var(--font-size-xs);
    line-height: var(--line-height-base);
    color: var(--color-text-primary);
    pointer-events: auto;

    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 5px;
      border-style: solid;
      border-color: var(--color-accent-primary) transparent transparent transparent;
    }
  }

  &__term-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    color: var(--color-accent-primary);
  }

  &__term-desc {
    color: var(--color-text-secondary);
  }
}
</style>
