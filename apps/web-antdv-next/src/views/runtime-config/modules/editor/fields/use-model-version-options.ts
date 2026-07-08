import type { Ref } from 'vue';

import type { MarketCategory, ModelPickerSide } from '@vben/types';

import { ref } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import { listPublishedModelOptions } from '#/api/research';
import { $t } from '#/locales';

interface OptionItem {
  categoryScope: MarketCategory | null;
  label: string;
  value: string;
}

export interface ModelVersionOptionsControls {
  loading: Ref<boolean>;
  options: Ref<OptionItem[]>;
  /** Re-fetch the eligible `Published` catalog for `category`/`side`. */
  reload: (
    category: MarketCategory | undefined,
    side: ModelPickerSide,
  ) => Promise<void>;
}

/**
 * `GET /research/models/published-catalog` selector source for the governed
 * `ModelVersionSelect` widget (11.2.2 remediation R8). One instance per field
 * — category/side are re-supplied on every `reload` since the same widget
 * component serves every model-pointer field with different filter props.
 */
export function useModelVersionOptions(): ModelVersionOptionsControls {
  const { handleRequest } = useRequestHandler();
  const options = ref<OptionItem[]>([]);
  const loading = ref(false);

  async function reload(
    category: MarketCategory | undefined,
    side: ModelPickerSide,
  ): Promise<void> {
    loading.value = true;
    const rows = await handleRequest(
      () => listPublishedModelOptions({ category, side }),
      {
        errorMessage: $t(
          'page.runtimeConfig.editor.field.modelVersionLoadError',
        ),
      },
    );
    options.value = (rows ?? []).map((row) => ({
      categoryScope: row.category_scope,
      label: `${row.spec_name} v${row.version} · ${
        row.category_scope
          ? $t(`enum.marketCategory.${row.category_scope}`)
          : $t('page.runtimeConfig.editor.field.modelVersionScopeGeneric')
      }`,
      value: row.model_version_id,
    }));
    loading.value = false;
  }

  return { loading, options, reload };
}
