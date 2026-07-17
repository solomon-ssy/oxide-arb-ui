<script lang="ts" setup>
interface Props {
  companyName?: string;
  companySiteLink?: string;
  date?: string;
  icp?: string;
  icpLink?: string;
}

defineOptions({
  name: 'Copyright',
});

withDefaults(defineProps<Props>(), {
  companyName: 'Quant Pivot',
  companySiteLink: '',
  date: '2026',
  icp: '',
  icpLink: '',
});
</script>

<template>
  <div class="text-md flex-center">
    <!-- ICP Link -->
    <a
      v-if="icp && icpLink"
      :href="icpLink"
      class="mx-1 hover:text-primary-hover"
      rel="noopener noreferrer"
      target="_blank"
    >
      {{ icp }}
    </a>
    <span v-else-if="icp" class="mx-1">{{ icp }}</span>

    <!-- Copyright Text -->
    Copyright © {{ date }}

    <!-- Company Link -->
    <a
      v-if="companyName && companySiteLink"
      :href="companySiteLink"
      class="mx-1 hover:text-primary-hover"
      rel="noopener noreferrer"
      target="_blank"
    >
      {{ companyName }}
    </a>
    <span v-else-if="companyName" class="mx-1">{{ companyName }}</span>
  </div>
</template>
