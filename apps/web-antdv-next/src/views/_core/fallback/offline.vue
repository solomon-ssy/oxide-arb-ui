<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Fallback } from '@vben/common-ui';
import { useAppConfig } from '@vben/hooks';
import { RotateCw } from '@vben/icons';
import { preferences } from '@vben/preferences';

import { Button } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'SystemOffline' });

const PROBE_TIMEOUT_MS = 5000;
const RETRY_INITIAL_MS = 1000;
const RETRY_MAX_MS = 30_000;

const route = useRoute();
const router = useRouter();
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
const checking = ref(false);
const attempt = ref(0);
const retryAt = ref(0);
const clock = ref(Date.now());

let stopped = false;
let retryTimer: null | ReturnType<typeof setTimeout> = null;
let clockTimer: null | ReturnType<typeof setInterval> = null;

const retryInSeconds = computed(() =>
  retryAt.value > 0
    ? Math.max(0, Math.ceil((retryAt.value - clock.value) / 1000))
    : 0,
);

const readinessUrl = computed(() => {
  const url = new URL(apiURL, window.location.origin);
  url.pathname = `${url.pathname.replace(/\/api\/?$/, '').replace(/\/$/, '')}/ready`;
  url.search = '';
  url.hash = '';
  return url.toString();
});

function recoveryTarget(): string {
  const raw = Array.isArray(route.query.return_to)
    ? route.query.return_to[0]
    : route.query.return_to;
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')
    ? raw
    : preferences.app.defaultHomePath;
}

function nextDelay(): number {
  const base = Math.min(RETRY_INITIAL_MS * 2 ** attempt.value, RETRY_MAX_MS);
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

function schedule() {
  if (stopped || retryTimer !== null) {
    return;
  }
  const delay = nextDelay();
  retryAt.value = Date.now() + delay;
  attempt.value += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void checkReadiness();
  }, delay);
}

async function checkReadiness() {
  if (stopped || checking.value) {
    return;
  }
  checking.value = true;
  retryAt.value = 0;
  try {
    const response = await fetch(readinessUrl.value, {
      cache: 'no-store',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (response.ok) {
      stopped = true;
      await router.replace(recoveryTarget());
      return;
    }
  } catch {
    // The next bounded backoff probe owns recovery.
  } finally {
    checking.value = false;
  }
  schedule();
}

function retryNow() {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  attempt.value = 0;
  void checkReadiness();
}

onMounted(() => {
  clockTimer = setInterval(() => {
    clock.value = Date.now();
  }, 250);
  void checkReadiness();
});
onBeforeUnmount(() => {
  stopped = true;
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
  }
  if (clockTimer !== null) {
    clearInterval(clockTimer);
  }
});
</script>

<template>
  <Fallback
    :description="$t('page.systemOffline.description')"
    status="offline"
    :title="$t('page.systemOffline.title')"
  >
    <template #action>
      <div class="flex flex-col items-center gap-3">
        <p aria-live="polite" class="text-muted-foreground text-sm">
          {{
            checking
              ? $t('page.systemOffline.checking')
              : $t('page.systemOffline.retryCountdown', {
                  seconds: retryInSeconds,
                })
          }}
        </p>
        <Button
          autofocus
          :loading="checking"
          size="large"
          type="primary"
          @click="retryNow"
        >
          <RotateCw aria-hidden="true" class="mr-2 size-4" />
          {{ $t('page.systemOffline.retry') }}
        </Button>
      </div>
    </template>
  </Fallback>
</template>
