<script lang="ts" setup>
import { computed } from 'vue';

import { Empty, Tag } from 'antdv-next';
import DOMPurify from 'dompurify';
import * as jsondiffpatch from 'jsondiffpatch';
import { format as formatHtmlDelta } from 'jsondiffpatch/formatters/html';

import { $t } from '#/locales';

defineOptions({ name: 'JsonDiffList' });

const props = withDefaults(
  defineProps<{
    emptyText?: string;
    items: JsonDiffListItem[];
  }>(),
  { emptyText: undefined },
);

export interface JsonDiffListItem {
  badge?: { color: string; label: string };
  key: string;
  next: unknown;
  previous: unknown;
  /** Monospace secondary line (e.g. the JSON path). */
  subtitle?: string;
  /** Human label (e.g. the field name). */
  title?: string;
}

interface RenderedDiff {
  html: null | string;
  item: JsonDiffListItem;
}

/**
 * Structural diff rendering via `jsondiffpatch` — replaces a naive
 * side-by-side `JSON.stringify` dump with a real key/array-aware diff
 * (nested object and array values get per-key highlighting instead of two
 * blobs the reader has to eyeball-compare). `html` is `null` only for the
 * degenerate case where a row was constructed for two deep-equal values.
 *
 * `jsondiffpatch`'s own HTML formatter already HTML-escapes every leaf value
 * it embeds (see `formatValue` in its `formatters/html`), so this is not
 * exploitable with the data this component actually renders (JSON document
 * diffs). It is sanitized through `dompurify` anyway before reaching
 * `v-html`: the formatter's escaping is an implementation detail of a
 * third-party dependency we don't own, not a security boundary we should
 * rely on — defense in depth is cheap here and keeps this safe across
 * `jsondiffpatch` upgrades.
 */
const rendered = computed<RenderedDiff[]>(() =>
  props.items.map((item) => {
    const delta = jsondiffpatch.diff(item.previous, item.next);
    const html = delta ? (formatHtmlDelta(delta, item.previous) ?? null) : null;
    return {
      html: html ? DOMPurify.sanitize(html) : null,
      item,
    };
  }),
);
</script>

<template>
  <div v-if="items.length === 0" class="py-4">
    <Empty :description="emptyText" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
  </div>
  <div v-else class="max-h-96 space-y-3 overflow-auto">
    <div
      v-for="row in rendered"
      :key="row.item.key"
      class="border-border bg-card rounded-md border p-3 text-xs"
    >
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <span v-if="row.item.title" class="text-foreground font-medium">
          {{ row.item.title }}
        </span>
        <span v-if="row.item.subtitle" class="text-primary font-mono">
          {{ row.item.subtitle }}
        </span>
        <Tag v-if="row.item.badge" :color="row.item.badge.color">
          {{ row.item.badge.label }}
        </Tag>
      </div>
      <!--
        `row.html` is sanitized with `dompurify` in the `rendered` computed
        above (`vue/no-v-html` cannot see that at lint-time — it only sees
        this binding, not the data flow).
      -->
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="row.html"
        class="json-diff-list-delta overflow-auto rounded"
        v-html="row.html"
      ></div>
      <!-- eslint-enable vue/no-v-html -->
      <p v-else class="text-muted-foreground">
        {{ $t('page.shared.jsonDiffList.noChange') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/*
 * jsondiffpatch's HTML formatter ships hardcoded pastel colors with no dark
 * mode support (see jsondiffpatch/formatters/styles/html.css). We re-skin its
 * fixed class names with the app's design tokens instead of importing that
 * stylesheet — `:deep()` is required because `v-html` content is not subject
 * to Vue's scoped-style attribute rewriting.
 */
.json-diff-list-delta :deep(.jsondiffpatch-delta) {
  display: inline-block;
  padding: 0 0 0 0.75rem;
  margin: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
}

.json-diff-list-delta :deep(ul.jsondiffpatch-delta),
.json-diff-list-delta :deep(.jsondiffpatch-delta ul) {
  padding: 0 0 0 1.25rem;
  margin: 0;
  list-style-type: none;
}

.json-diff-list-delta :deep(.jsondiffpatch-added .jsondiffpatch-property-name),
.json-diff-list-delta :deep(.jsondiffpatch-added .jsondiffpatch-value pre),
.json-diff-list-delta
  :deep(.jsondiffpatch-modified .jsondiffpatch-right-value pre),
.json-diff-list-delta :deep(.jsondiffpatch-textdiff-added) {
  color: var(--color-success-text);
  background: var(--color-success-background-lightest);
}

.json-diff-list-delta
  :deep(.jsondiffpatch-deleted .jsondiffpatch-property-name),
.json-diff-list-delta :deep(.jsondiffpatch-deleted pre),
.json-diff-list-delta
  :deep(.jsondiffpatch-modified .jsondiffpatch-left-value pre),
.json-diff-list-delta :deep(.jsondiffpatch-textdiff-deleted) {
  color: var(--color-destructive-text);
  text-decoration: line-through;
  background: var(--color-destructive-background-lightest);
}

.json-diff-list-delta :deep(.jsondiffpatch-unchanged),
.json-diff-list-delta :deep(.jsondiffpatch-movedestination) {
  color: var(--color-muted-foreground);
}

.json-diff-list-delta :deep(.jsondiffpatch-moved .jsondiffpatch-property-name) {
  color: var(--color-muted-foreground);
  text-decoration: line-through;
}

.json-diff-list-delta :deep(.jsondiffpatch-moved .jsondiffpatch-value) {
  display: none;
}

.json-diff-list-delta
  :deep(.jsondiffpatch-moved .jsondiffpatch-moved-destination) {
  display: inline-block;
  color: var(--color-warning-text);
  background: var(--color-warning-background-lightest);
}

.json-diff-list-delta
  :deep(.jsondiffpatch-moved .jsondiffpatch-moved-destination::before) {
  content: ' => ';
}

.json-diff-list-delta :deep(.jsondiffpatch-value) {
  display: inline-block;
}

.json-diff-list-delta :deep(.jsondiffpatch-property-name) {
  display: inline-block;
  padding-right: 0.3rem;
  vertical-align: top;
}

.json-diff-list-delta :deep(.jsondiffpatch-property-name::after) {
  content: ': ';
}

.json-diff-list-delta :deep(.jsondiffpatch-modified .jsondiffpatch-value) {
  display: inline-block;
}

.json-diff-list-delta
  :deep(.jsondiffpatch-modified .jsondiffpatch-right-value) {
  margin-left: 0.3rem;
}

.json-diff-list-delta :deep(.jsondiffpatch-error) {
  font-weight: 600;
  color: var(--color-destructive-foreground);
  background: var(--color-destructive);
}
</style>
