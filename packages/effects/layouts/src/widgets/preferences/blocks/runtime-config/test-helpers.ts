import type { RuntimeConfigSchemaFieldView, UiText } from '@vben/types';

export function uiText(en: string, zh = en): UiText {
  return {
    kind: 'localized',
    locales: {
      'en-US': en,
      'zh-CN': zh,
    },
  };
}

export function fieldStub(
  partial: Partial<RuntimeConfigSchemaFieldView> &
    Pick<RuntimeConfigSchemaFieldView, 'path' | 'value_type'>,
): RuntimeConfigSchemaFieldView {
  return {
    default: '',
    description: partial.path,
    group: 'risk',
    help: uiText(`${partial.path} help`),
    label: uiText(partial.path),
    money_critical: false,
    order: 10,
    sensitive: false,
    ...partial,
  };
}
