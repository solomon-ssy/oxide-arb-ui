import type { Directive, DirectiveBinding } from 'vue';

function annotateTableScroll(
  root: HTMLElement,
  binding: DirectiveBinding<string>,
) {
  const label = binding.value.trim();
  for (const region of root.querySelectorAll<HTMLElement>(
    '.ant-table-content',
  )) {
    region.tabIndex = 0;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', label);
  }
}

/** Makes Ant Table's actual horizontal scroll container keyboard accessible. */
export const vAccessibleTableScroll: Directive<HTMLElement, string> = {
  mounted: annotateTableScroll,
  updated: annotateTableScroll,
};
