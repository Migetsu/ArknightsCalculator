<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
}

const props = defineProps<Props>()

interface Token {
  text: string
  isDigit: boolean
}

const tokens = computed<Token[]>(() => {
  if (!props.name) return []
  const parts: Token[] = []
  const regex = /(\d+)|([^\d]+)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(props.name)) !== null) {
    if (match[1]) {
      parts.push({ text: match[1], isDigit: true })
    } else if (match[2]) {
      parts.push({ text: match[2], isDigit: false })
    }
  }
  return parts
})
</script>

<template>
  <span class="ak-operator-name">
    <template v-for="(token, idx) in tokens" :key="idx">
      <span v-if="token.isDigit" class="u-font-alt-num">{{ token.text }}</span>
      <template v-else>{{ token.text }}</template>
    </template>
  </span>
</template>
