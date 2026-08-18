<script lang="ts" setup>
defineOptions({ name: 'WorkspaceInspectorHost' });
</script>

<template>
  <div class="workspace-inspector-host">
    <slot></slot>
  </div>
</template>

<style scoped>
.workspace-inspector-host {
  width: 100%;
  min-width: 0;
  min-height: 0;
}
</style>
