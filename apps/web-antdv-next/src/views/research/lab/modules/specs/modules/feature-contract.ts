import type { FeatureContractView } from '@vben/types';

import { ref } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { getFeatureContract } from '#/api/research';

/** Load the sole governed model-input catalog from the active backend schema. */
export function useFeatureContract() {
  const { handleRequest } = useRequestHandler();
  const contract = ref<FeatureContractView | null>(null);
  const loading = ref(false);
  const loadError = ref(false);

  async function reload(): Promise<FeatureContractView | null> {
    loading.value = true;
    loadError.value = false;
    try {
      const loaded = await handleRequest(getFeatureContract, { silent: true });
      if (!loaded) {
        contract.value = null;
        loadError.value = true;
        return null;
      }
      contract.value = loaded;
      return loaded;
    } catch {
      contract.value = null;
      loadError.value = true;
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { contract, loadError, loading, reload };
}
