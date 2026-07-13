import type { FeatureContractView } from '@vben/types';

/** Project exactly the server catalog into selector options. No local feature
 * names or factor inputs are merged into this list. */
export function featureContractOptions(contract: FeatureContractView) {
  return contract.features.map((feature) => ({
    label: feature.name,
    value: feature.name,
  }));
}
