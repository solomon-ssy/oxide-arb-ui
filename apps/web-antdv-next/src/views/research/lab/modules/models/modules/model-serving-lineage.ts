import type {
  FactorDefinitionDetailView,
  FactorServingDefinitionRef,
  FactorServingUsageView,
  ModelDetailView,
  ModelServingProfileArtifactRef,
} from '@vben/types';

export interface ModelServingLineagePresentation {
  capabilityRegistryHashes: string[];
  contractHash: string;
  contractVersion: number;
  evaluationCount: number;
  evaluationHasNext: boolean;
  evaluationPage: number;
  evaluationSize: number;
  factorDefinitions: FactorServingDefinitionRef[];
  factorSchemaHash: string;
  promotionCount: number;
  requiredDomainFamilies: Array<'crypto' | 'weather'>;
}

/** Project exact serving identities without interpreting contract policy. */
export function modelServingLineage(
  detail: ModelDetailView,
): ModelServingLineagePresentation {
  const contract = detail.serving_contract;
  return {
    capabilityRegistryHashes: contract.bindings.capability_registry_hashes,
    contractHash: detail.serving_contract_hash,
    contractVersion: contract.contract_version,
    evaluationCount: detail.evaluation_lineage.total,
    evaluationHasNext: detail.evaluation_lineage.has_next,
    evaluationPage: detail.evaluation_lineage.page,
    evaluationSize: detail.evaluation_lineage.size,
    factorDefinitions: contract.bindings.factors.plane.definitions,
    factorSchemaHash: contract.bindings.factors.plane.factor_schema_hash,
    promotionCount: detail.promotion_lineage.length,
    requiredDomainFamilies: contract.bindings.required_domain_families,
  };
}

export interface ModelServingCommitments {
  biasTableHash: null | string;
  datasetBytesHash: string;
  datasetManifestHash: string;
  featureSchemaHash: string;
  inputContractHash: string;
  inputTransformHash: string;
  labelSchemaHash: string;
  modelCalibrationHash: null | string;
  modelPayloadHash: string;
  modelSpecDefinitionHash: string;
  policySnapshotHash: string;
  profileArtifacts: ModelServingProfileArtifactRef[];
  profileContentHash: string;
  serializedModelHash: null | string;
  tradePolicyHash: null | string;
  trainingDatasetHash: string;
  trainingInputHash: string;
}

/** Preserve every content-addressed serving commitment without recomputation. */
export function modelServingCommitments(
  detail: ModelDetailView,
): ModelServingCommitments {
  const bindings = detail.serving_contract.bindings;
  const estimator = bindings.model.estimator;
  const profiles = bindings.policy_snapshot.profile_artifacts;
  return {
    biasTableHash: bindings.factors.bias_table?.content_hash ?? null,
    datasetBytesHash: bindings.dataset.artifact_bytes_hash,
    datasetManifestHash: bindings.dataset.manifest_hash,
    featureSchemaHash: bindings.schemas.feature_schema_hash,
    inputContractHash: bindings.transform.input_contract_hash,
    inputTransformHash: bindings.transform.input_transform_hash,
    labelSchemaHash: bindings.schemas.label_schema_hash,
    modelCalibrationHash: bindings.model.calibration?.content_hash ?? null,
    modelPayloadHash: estimator.model_payload_hash,
    modelSpecDefinitionHash: bindings.model.model_spec_definition_hash,
    policySnapshotHash: bindings.policy_snapshot.snapshot_hash,
    profileArtifacts: [
      profiles.features,
      profiles.scoring,
      profiles.domain,
      profiles.research_method,
    ],
    profileContentHash: bindings.model.profile_ref.content_hash,
    serializedModelHash:
      estimator.estimator_kind === 'classical'
        ? estimator.serialized_model_hash
        : null,
    tradePolicyHash: bindings.trade_policy?.content_hash ?? null,
    trainingDatasetHash: bindings.transform.training_dataset_hash,
    trainingInputHash: bindings.transform.training_input_hash,
  };
}

export interface FactorServingUsagePresentation {
  hasNext: boolean;
  items: FactorServingUsageView[];
  total: number;
}

/** Preserve the backend's independent usage page and exact model identities. */
export function factorServingUsage(
  detail: FactorDefinitionDetailView,
): FactorServingUsagePresentation {
  return {
    hasNext: detail.serving_usage.has_next,
    items: detail.serving_usage.items,
    total: detail.serving_usage.total,
  };
}
