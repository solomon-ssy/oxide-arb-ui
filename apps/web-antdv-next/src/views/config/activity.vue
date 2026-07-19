<script lang="ts" setup>
import type { ConfigActivityView } from '@vben/types/config-api';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Button, Empty, Skeleton, Tag } from 'antdv-next';

import { getConfigActivity } from '#/api/config';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'ConfigActivityPage' });

const router = useRouter();
const { handleRequest } = useRequestHandler();
const loading = ref(true);
const activity = ref<ConfigActivityView[]>([]);

function timestamp(item: ConfigActivityView) {
  switch (item.event_type) {
    case 'activation': {
      return item.event.activated_at;
    }
    case 'approval': {
      return item.event.decided_at;
    }
    case 'revision': {
      return item.event.created_at;
    }
  }
}

function actor(item: ConfigActivityView) {
  switch (item.event_type) {
    case 'activation': {
      return item.event.activated_by.label;
    }
    case 'approval': {
      return item.event.decided_by.label;
    }
    case 'revision': {
      return item.event.created_by.label;
    }
  }
}

function resource(item: ConfigActivityView) {
  return item.event.resource_kind;
}

async function loadActivity() {
  loading.value = true;
  const result = await handleRequest(() => getConfigActivity(100));
  if (result) activity.value = result;
  loading.value = false;
}

onMounted(() => void loadActivity());
</script>

<template>
  <Page auto-content-height data-testid="config-activity">
    <div class="mx-auto flex max-w-[1080px] flex-col gap-4 pb-8">
      <header class="bg-card rounded-xl border p-5">
        <div class="flex items-start gap-3">
          <Button
            :aria-label="$t('page.config.nav.back')"
            shape="circle"
            type="text"
            @click="router.push('/system/config')"
          >
            <IconifyIcon icon="lucide:arrow-left" />
          </Button>
          <span class="section-icon">
            <IconifyIcon icon="lucide:history" />
          </span>
          <div>
            <p class="text-primary text-xs font-semibold tracking-wide">
              {{ $t('page.config.eyebrow') }}
            </p>
            <h1 class="text-xl font-semibold">
              {{ $t('page.config.activity.title') }}
            </h1>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ $t('page.config.activity.description') }}
            </p>
          </div>
        </div>
      </header>

      <Skeleton v-if="loading" :paragraph="{ rows: 12 }" active />
      <section v-else class="bg-card rounded-xl border p-5">
        <ol v-if="activity.length > 0" class="activity-list">
          <li
            v-for="item in activity"
            :key="`${item.event_type}:${timestamp(item)}`"
          >
            <span class="activity-icon">
              <IconifyIcon
                :icon="
                  item.event_type === 'activation'
                    ? 'lucide:circle-check-big'
                    : item.event_type === 'approval'
                      ? 'lucide:badge-check'
                      : 'lucide:file-pen-line'
                "
              />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-sm font-semibold">
                  {{ $t(`page.config.activity.event.${item.event_type}`) }}
                </h2>
                <Tag>
                  {{ $t(`page.config.resources.kind.${resource(item)}`) }}
                </Tag>
              </div>
              <p class="text-muted-foreground mt-1 text-sm">
                {{ actor(item) }} · {{ item.event.reason }}
              </p>
            </div>
            <time
              class="text-muted-foreground text-xs"
              data-screenshot-volatile="true"
            >
              {{ formatDateTimeLocal(timestamp(item)) }}
            </time>
          </li>
        </ol>
        <Empty v-else :description="$t('page.config.activity.empty')" />
      </section>
    </div>
  </Page>
</template>

<style scoped>
.section-icon,
.activity-icon {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.section-icon {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.15rem;
  border-radius: 0.65rem;
}

.activity-list li {
  position: relative;
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  padding: 0.9rem 0;
}

.activity-list li + li {
  border-top: 1px solid hsl(var(--border));
}

.activity-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
}

@media (max-width: 640px) {
  .activity-list li {
    flex-wrap: wrap;
  }

  .activity-list time {
    margin-left: 2.9rem;
  }
}
</style>
