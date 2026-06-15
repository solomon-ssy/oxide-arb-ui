<script setup lang="ts">
import { computed } from 'vue';

defineProps<{
  disabled?: boolean;
}>();

const model = defineModel<unknown>({ required: true });

const text = computed({
  get: () => JSON.stringify(model.value ?? null, null, 2),
  set: (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      model.value = null;
      return;
    }
    try {
      model.value = JSON.parse(trimmed) as unknown;
    } catch {
      // Keep the invalid draft text; validation happens on apply.
    }
  },
});
</script>

<template>
  <textarea
    v-model="text"
    class="bg-muted text-foreground min-h-32 w-full rounded-md border p-2 font-mono text-xs"
    :disabled="disabled"
    spellcheck="false"
  ></textarea>
</template>
