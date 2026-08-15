/* oxlint-disable */
// @ts-nocheck -- generated Ajv standalone validation code
import formatRuntime from 'ajv-formats/dist/formats.js';
import ucs2LengthRuntime from 'ajv/dist/runtime/ucs2length.js';
const fullFormats =
  formatRuntime.fullFormats ?? formatRuntime.default?.fullFormats;
const ucs2Length =
  typeof ucs2LengthRuntime === 'function'
    ? ucs2LengthRuntime
    : ucs2LengthRuntime.default;
('use strict');
export const validateCreateModelSpec = validate37;
const schema32 = {
  description:
    'Inbound body for `POST /research/model-specs`.\n\nA model spec is the **authoring root** of the offline research lifecycle:\nthe operator declares the model family, prediction horizon, and feature /\nlabel schema versions the downstream dataset build and training runs bind\nto. A spec and every trained model version are immutable; serving role is\nderived only from a governed route generation.\n\n`model_family` deserializes from its canonical wire label (`"weighted_factor"`,\n`"classical_random_forest"`, `"hold_vs_exit_weighted"`, …); an unknown label\nis rejected at the boundary with `400`.',
  type: 'object',
  properties: {
    feature_schema_version: {
      description:
        'Feature schema version the spec targets (defaults to the first version).',
      $ref: '#/$defs/SchemaVersion',
      default: 1,
    },
    input_contract: {
      description:
        'Ordered raw-input contract. This field is mandatory: an empty contract,\nunknown feature, duplicate, or encoded/synthetic name is rejected.',
      $ref: '#/$defs/ModelInputContract',
    },
    label_schema_version: {
      description:
        'Label schema version the spec targets (defaults to the first version).',
      $ref: '#/$defs/SchemaVersion',
      default: 1,
    },
    model_family: {
      description:
        'Model family this spec authors (Buy ranker, Sell/exit scorer, classical).',
      $ref: '#/$defs/ModelFamily',
    },
    name: {
      description:
        'Human-facing spec name (unique-ish label shown in the catalog picker).',
      type: 'string',
      maxLength: 128,
      minLength: 1,
    },
    prediction_horizon_secs: {
      description: 'Model-intrinsic prediction horizon in seconds (`>= 1`).',
      type: 'integer',
      minimum: 1,
      maximum: 9007199254740991,
    },
    reason: {
      description:
        'Operator reason recorded on the operation log (UI should require non-empty).',
      type: 'string',
      maxLength: 512,
      minLength: 1,
    },
    thesis: {
      description:
        'Closed, human-authored research thesis. This cannot carry executable\nparameters or arbitrary metadata keys.',
      $ref: '#/$defs/ModelSpecThesis',
    },
    training_contract: {
      description:
        'Frozen typed target, evaluation-policy binding, and CV folds.\nTraining cannot override these semantics.',
      $ref: '#/$defs/ModelTrainingContract',
    },
  },
  additionalProperties: false,
  required: [
    'name',
    'model_family',
    'prediction_horizon_secs',
    'thesis',
    'input_contract',
    'training_contract',
    'reason',
  ],
};
const schema33 = {
  description:
    'A monotonic schema version for feature / factor / label / config schemas.\n\nWrapping the version prevents accidentally mixing it with unrelated integers\n(counts, ids, ordinals) and makes "which schema generated this row" explicit\nin every signature. Versions are `>= 1` by convention; untrusted wire and DB\nvalues are validated through [`SchemaVersion::try_new`].',
  type: 'integer',
  minimum: -2147483648,
  maximum: 2147483647,
};
const schema38 = {
  oneOf: [
    {
      type: 'string',
      enum: [
        'weighted_factor',
        'classical_gradient_boosted_trees',
        'classical_random_forest',
        'classical_extra_trees',
        'classical_logistic_regression',
        'classical_ridge',
        'classical_lasso',
        'classical_elastic_net',
      ],
    },
    {
      description:
        'Sell-side hold-vs-exit weighted scorer. Distinct family\nfrom the Buy-side `WeightedFactor` ranker so a Sell artifact can never\nbe confused for a Buy artifact at the registry / runtime boundary.',
      type: 'string',
      const: 'hold_vs_exit_weighted',
    },
  ],
};
const schema39 = {
  description:
    'Human-authored research thesis that cannot be inferred from executable fields.\n\nThis is intentionally a closed document rather than a free-form metadata map.\nIt is read and written atomically with the immutable model spec, never queried\nby individual JSON keys, and therefore uses typed JSONB through\n[`FromJsonQueryResult`]. Executable inputs, targets, horizons, and lifecycle\nstate do not belong here.',
  type: 'object',
  properties: {
    hypothesis: {
      description:
        'Falsifiable relationship the research line is expected to demonstrate.',
      type: 'string',
    },
    limitations: {
      description:
        'Known boundaries that must be considered when evaluating a trained version.',
      type: 'array',
      items: { type: 'string' },
    },
    summary: {
      description: 'Concise catalog summary for operators.',
      type: 'string',
    },
  },
  additionalProperties: false,
  required: ['summary', 'hypothesis', 'limitations'],
};
const func1 = Object.prototype.hasOwnProperty;
const func2 = ucs2Length;
const schema34 = {
  description:
    'Frozen ordered raw-input graph for one model specification.\n\nEncoded/synthetic columns are intentionally absent: they are derived only by\nthe fitted transform and can never enter this source contract.',
  type: 'object',
  properties: {
    inputs: { type: 'array', items: { $ref: '#/$defs/ModelInputSpec' } },
  },
  additionalProperties: false,
  required: ['inputs'],
};
const schema35 = {
  description: 'One ordered raw feature consumed by a model.',
  type: 'object',
  properties: {
    feature_name: {
      description: 'Stable feature name from the governed feature catalog.',
      type: 'string',
    },
    requiredness: {
      description: 'Model-level availability requirement.',
      $ref: '#/$defs/ModelInputRequiredness',
    },
  },
  additionalProperties: false,
  required: ['feature_name', 'requiredness'],
};
const schema36 = {
  description:
    'Whether a raw feature may be imputed by the fitted model-input transform.',
  oneOf: [
    {
      description:
        'Only a genuinely observed cell is accepted; all other states reject the row.',
      type: 'string',
      const: 'required',
    },
    {
      description:
        'Missing states are retained and handled by the fitted transform.',
      type: 'string',
      const: 'optional',
    },
  ],
};
function validate23(
  data,
  {
    instancePath = '',
    parentData,
    parentDataProperty,
    rootData = data,
    dynamicAnchors = {},
  } = {},
) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate23.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = undefined;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = undefined;
  }
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.feature_name === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'feature_name' },
        message: "must have required property '" + 'feature_name' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.requiredness === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'requiredness' },
        message: "must have required property '" + 'requiredness' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === 'feature_name' || key0 === 'requiredness')) {
        const err2 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.feature_name !== undefined) {
      if (typeof data.feature_name !== 'string') {
        const err3 = {
          instancePath: instancePath + '/feature_name',
          schemaPath: '#/properties/feature_name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.requiredness !== undefined) {
      let data1 = data.requiredness;
      const _errs6 = errors;
      let valid2 = false;
      let passing0 = null;
      const _errs7 = errors;
      if (typeof data1 !== 'string') {
        const err4 = {
          instancePath: instancePath + '/requiredness',
          schemaPath: '#/$defs/ModelInputRequiredness/oneOf/0/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
      if ('required' !== data1) {
        const err5 = {
          instancePath: instancePath + '/requiredness',
          schemaPath: '#/$defs/ModelInputRequiredness/oneOf/0/const',
          keyword: 'const',
          params: { allowedValue: 'required' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
      var _valid0 = _errs7 === errors;
      if (_valid0) {
        valid2 = true;
        passing0 = 0;
      }
      const _errs9 = errors;
      if (typeof data1 !== 'string') {
        const err6 = {
          instancePath: instancePath + '/requiredness',
          schemaPath: '#/$defs/ModelInputRequiredness/oneOf/1/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ('optional' !== data1) {
        const err7 = {
          instancePath: instancePath + '/requiredness',
          schemaPath: '#/$defs/ModelInputRequiredness/oneOf/1/const',
          keyword: 'const',
          params: { allowedValue: 'optional' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      var _valid0 = _errs9 === errors;
      if (_valid0 && valid2) {
        valid2 = false;
        passing0 = [passing0, 1];
      } else {
        if (_valid0) {
          valid2 = true;
          passing0 = 1;
        }
      }
      if (!valid2) {
        const err8 = {
          instancePath: instancePath + '/requiredness',
          schemaPath: '#/$defs/ModelInputRequiredness/oneOf',
          keyword: 'oneOf',
          params: { passingSchemas: passing0 },
          message: 'must match exactly one schema in oneOf',
        };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      } else {
        errors = _errs6;
        if (vErrors !== null) {
          if (_errs6) {
            vErrors.length = _errs6;
          } else {
            vErrors = null;
          }
        }
      }
    }
  } else {
    const err9 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err9];
    } else {
      vErrors.push(err9);
    }
    errors++;
  }
  validate23.errors = vErrors;
  return errors === 0;
}
validate23.evaluated = {
  props: true,
  dynamicProps: false,
  dynamicItems: false,
};
function validate22(
  data,
  {
    instancePath = '',
    parentData,
    parentDataProperty,
    rootData = data,
    dynamicAnchors = {},
  } = {},
) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate22.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = undefined;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = undefined;
  }
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.inputs === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'inputs' },
        message: "must have required property '" + 'inputs' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === 'inputs')) {
        const err1 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.inputs !== undefined) {
      let data0 = data.inputs;
      if (Array.isArray(data0)) {
        const len0 = data0.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate23(data0[i0], {
              instancePath: instancePath + '/inputs/' + i0,
              parentData: data0,
              parentDataProperty: i0,
              rootData,
              dynamicAnchors,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate23.errors
                : vErrors.concat(validate23.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err2 = {
          instancePath: instancePath + '/inputs',
          schemaPath: '#/properties/inputs/type',
          keyword: 'type',
          params: { type: 'array' },
          message: 'must be array',
        };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
  } else {
    const err3 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err3];
    } else {
      vErrors.push(err3);
    }
    errors++;
  }
  validate22.errors = vErrors;
  return errors === 0;
}
validate22.evaluated = {
  props: true,
  dynamicProps: false,
  dynamicItems: false,
};
const schema40 = {
  description:
    'Frozen supervised-target and cross-validation policy owned by a model spec.\nTraining requests cannot override these fields.',
  type: 'object',
  properties: {
    evaluation_trade_policy_artifact_id: {
      description:
        'Published policy used only for OOS executable evaluation and Route\nreadiness. It does not generate or redefine the supervised target.',
      type: ['string', 'null'],
      format: 'uuid',
    },
    target: {
      description:
        'Closed task whose exact label name and horizon are derived, never typed\nas an arbitrary string by an operator.',
      $ref: '#/$defs/ModelTrainingTarget',
    },
    validation_folds: {
      description:
        'Rolling validation fold count. Every fold fits its own transform.',
      type: 'integer',
      minimum: 0,
      maximum: 4294967295,
    },
  },
  additionalProperties: false,
  required: ['target', 'validation_folds'],
};
const schema41 = {
  description:
    "Closed supervised-task taxonomy for production model specifications.\n\nA Buy model forecasts the selected token's terminal redemption fraction.\nExecutable prices, fills, fees, exits, and capital costs belong to the\nindependently frozen Trade Policy evaluation and global portfolio layers;\nthey are never folded into this forecasting target. The sell-side scorer\nowns the only other supported task.",
  oneOf: [
    {
      description:
        'Calibrated expected terminal payout in `[0, 1]` for a canonical token.',
      type: 'object',
      properties: { kind: { type: 'string', const: 'outcome_payout' } },
      additionalProperties: false,
      required: ['kind'],
    },
    {
      description:
        'Research-only forward mark-return regression target. It is valid for\noffline model comparison but cannot become a promoted Buy Route because\nit does not provide a calibrated payout distribution.',
      type: 'object',
      properties: {
        horizon_secs: {
          description: 'Exact forward-label horizon in seconds.',
          type: 'integer',
          minimum: 0,
          maximum: 9007199254740991,
        },
        kind: { type: 'string', const: 'forward_return' },
      },
      additionalProperties: false,
      required: ['kind', 'horizon_secs'],
    },
    {
      description:
        'Executable advantage, in bps, of exiting a held lot instead of holding.',
      type: 'object',
      properties: { kind: { type: 'string', const: 'hold_vs_exit_alpha' } },
      additionalProperties: false,
      required: ['kind'],
    },
  ],
};
const formats0 = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
function validate26(
  data,
  {
    instancePath = '',
    parentData,
    parentDataProperty,
    rootData = data,
    dynamicAnchors = {},
  } = {},
) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate26.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = undefined;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = undefined;
  }
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.target === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'target' },
        message: "must have required property '" + 'target' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.validation_folds === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'validation_folds' },
        message: "must have required property '" + 'validation_folds' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (
        !(
          key0 === 'evaluation_trade_policy_artifact_id' ||
          key0 === 'target' ||
          key0 === 'validation_folds'
        )
      ) {
        const err2 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.evaluation_trade_policy_artifact_id !== undefined) {
      let data0 = data.evaluation_trade_policy_artifact_id;
      if (typeof data0 !== 'string' && data0 !== null) {
        const err3 = {
          instancePath: instancePath + '/evaluation_trade_policy_artifact_id',
          schemaPath: '#/properties/evaluation_trade_policy_artifact_id/type',
          keyword: 'type',
          params: {
            type: schema40.properties.evaluation_trade_policy_artifact_id.type,
          },
          message: 'must be string,null',
        };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      if (typeof data0 === 'string') {
        if (!formats0.test(data0)) {
          const err4 = {
            instancePath: instancePath + '/evaluation_trade_policy_artifact_id',
            schemaPath:
              '#/properties/evaluation_trade_policy_artifact_id/format',
            keyword: 'format',
            params: { format: 'uuid' },
            message: 'must match format "' + 'uuid' + '"',
          };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      }
    }
    if (data.target !== undefined) {
      let data1 = data.target;
      const _errs6 = errors;
      let valid2 = false;
      let passing0 = null;
      const _errs7 = errors;
      if (data1 && typeof data1 == 'object' && !Array.isArray(data1)) {
        if (data1.kind === undefined) {
          const err5 = {
            instancePath: instancePath + '/target',
            schemaPath: '#/$defs/ModelTrainingTarget/oneOf/0/required',
            keyword: 'required',
            params: { missingProperty: 'kind' },
            message: "must have required property '" + 'kind' + "'",
          };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        for (const key1 in data1) {
          if (!(key1 === 'kind')) {
            const err6 = {
              instancePath: instancePath + '/target',
              schemaPath:
                '#/$defs/ModelTrainingTarget/oneOf/0/additionalProperties',
              keyword: 'additionalProperties',
              params: { additionalProperty: key1 },
              message: 'must NOT have additional properties',
            };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data1.kind !== undefined) {
          let data2 = data1.kind;
          if (typeof data2 !== 'string') {
            const err7 = {
              instancePath: instancePath + '/target/kind',
              schemaPath:
                '#/$defs/ModelTrainingTarget/oneOf/0/properties/kind/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
          if ('outcome_payout' !== data2) {
            const err8 = {
              instancePath: instancePath + '/target/kind',
              schemaPath:
                '#/$defs/ModelTrainingTarget/oneOf/0/properties/kind/const',
              keyword: 'const',
              params: { allowedValue: 'outcome_payout' },
              message: 'must be equal to constant',
            };
            if (vErrors === null) {
              vErrors = [err8];
            } else {
              vErrors.push(err8);
            }
            errors++;
          }
        }
      } else {
        const err9 = {
          instancePath: instancePath + '/target',
          schemaPath: '#/$defs/ModelTrainingTarget/oneOf/0/type',
          keyword: 'type',
          params: { type: 'object' },
          message: 'must be object',
        };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
      var _valid0 = _errs7 === errors;
      if (_valid0) {
        valid2 = true;
        passing0 = 0;
        var props0 = true;
      }
      const _errs12 = errors;
      if (data1 && typeof data1 == 'object' && !Array.isArray(data1)) {
        if (data1.kind === undefined) {
          const err10 = {
            instancePath: instancePath + '/target',
            schemaPath: '#/$defs/ModelTrainingTarget/oneOf/1/required',
            keyword: 'required',
            params: { missingProperty: 'kind' },
            message: "must have required property '" + 'kind' + "'",
          };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        if (data1.horizon_secs === undefined) {
          const err11 = {
            instancePath: instancePath + '/target',
            schemaPath: '#/$defs/ModelTrainingTarget/oneOf/1/required',
            keyword: 'required',
            params: { missingProperty: 'horizon_secs' },
            message: "must have required property '" + 'horizon_secs' + "'",
          };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        for (const key2 in data1) {
          if (!(key2 === 'horizon_secs' || key2 === 'kind')) {
            const err12 = {
              instancePath: instancePath + '/target',
              schemaPath:
                '#/$defs/ModelTrainingTarget/oneOf/1/additionalProperties',
              keyword: 'additionalProperties',
              params: { additionalProperty: key2 },
              message: 'must NOT have additional properties',
            };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data1.horizon_secs !== undefined) {
          let data3 = data1.horizon_secs;
          if (
            !(
              typeof data3 == 'number' &&
              !(data3 % 1) &&
              !isNaN(data3) &&
              isFinite(data3)
            )
          ) {
            const err13 = {
              instancePath: instancePath + '/target/horizon_secs',
              schemaPath:
                '#/$defs/ModelTrainingTarget/oneOf/1/properties/horizon_secs/type',
              keyword: 'type',
              params: { type: 'integer' },
              message: 'must be integer',
            };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
          if (typeof data3 == 'number' && isFinite(data3)) {
            if (data3 > 9007199254740991 || isNaN(data3)) {
              const err14 = {
                instancePath: instancePath + '/target/horizon_secs',
                schemaPath:
                  '#/$defs/ModelTrainingTarget/oneOf/1/properties/horizon_secs/maximum',
                keyword: 'maximum',
                params: { comparison: '<=', limit: 9007199254740991 },
                message: 'must be <= 9007199254740991',
              };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
            if (data3 < 0 || isNaN(data3)) {
              const err15 = {
                instancePath: instancePath + '/target/horizon_secs',
                schemaPath:
                  '#/$defs/ModelTrainingTarget/oneOf/1/properties/horizon_secs/minimum',
                keyword: 'minimum',
                params: { comparison: '>=', limit: 0 },
                message: 'must be >= 0',
              };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
          }
        }
        if (data1.kind !== undefined) {
          let data4 = data1.kind;
          if (typeof data4 !== 'string') {
            const err16 = {
              instancePath: instancePath + '/target/kind',
              schemaPath:
                '#/$defs/ModelTrainingTarget/oneOf/1/properties/kind/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
          if ('forward_return' !== data4) {
            const err17 = {
              instancePath: instancePath + '/target/kind',
              schemaPath:
                '#/$defs/ModelTrainingTarget/oneOf/1/properties/kind/const',
              keyword: 'const',
              params: { allowedValue: 'forward_return' },
              message: 'must be equal to constant',
            };
            if (vErrors === null) {
              vErrors = [err17];
            } else {
              vErrors.push(err17);
            }
            errors++;
          }
        }
      } else {
        const err18 = {
          instancePath: instancePath + '/target',
          schemaPath: '#/$defs/ModelTrainingTarget/oneOf/1/type',
          keyword: 'type',
          params: { type: 'object' },
          message: 'must be object',
        };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
      var _valid0 = _errs12 === errors;
      if (_valid0 && valid2) {
        valid2 = false;
        passing0 = [passing0, 1];
      } else {
        if (_valid0) {
          valid2 = true;
          passing0 = 1;
          if (props0 !== true) {
            props0 = true;
          }
        }
        const _errs19 = errors;
        if (data1 && typeof data1 == 'object' && !Array.isArray(data1)) {
          if (data1.kind === undefined) {
            const err19 = {
              instancePath: instancePath + '/target',
              schemaPath: '#/$defs/ModelTrainingTarget/oneOf/2/required',
              keyword: 'required',
              params: { missingProperty: 'kind' },
              message: "must have required property '" + 'kind' + "'",
            };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
          for (const key3 in data1) {
            if (!(key3 === 'kind')) {
              const err20 = {
                instancePath: instancePath + '/target',
                schemaPath:
                  '#/$defs/ModelTrainingTarget/oneOf/2/additionalProperties',
                keyword: 'additionalProperties',
                params: { additionalProperty: key3 },
                message: 'must NOT have additional properties',
              };
              if (vErrors === null) {
                vErrors = [err20];
              } else {
                vErrors.push(err20);
              }
              errors++;
            }
          }
          if (data1.kind !== undefined) {
            let data5 = data1.kind;
            if (typeof data5 !== 'string') {
              const err21 = {
                instancePath: instancePath + '/target/kind',
                schemaPath:
                  '#/$defs/ModelTrainingTarget/oneOf/2/properties/kind/type',
                keyword: 'type',
                params: { type: 'string' },
                message: 'must be string',
              };
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
            if ('hold_vs_exit_alpha' !== data5) {
              const err22 = {
                instancePath: instancePath + '/target/kind',
                schemaPath:
                  '#/$defs/ModelTrainingTarget/oneOf/2/properties/kind/const',
                keyword: 'const',
                params: { allowedValue: 'hold_vs_exit_alpha' },
                message: 'must be equal to constant',
              };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
          }
        } else {
          const err23 = {
            instancePath: instancePath + '/target',
            schemaPath: '#/$defs/ModelTrainingTarget/oneOf/2/type',
            keyword: 'type',
            params: { type: 'object' },
            message: 'must be object',
          };
          if (vErrors === null) {
            vErrors = [err23];
          } else {
            vErrors.push(err23);
          }
          errors++;
        }
        var _valid0 = _errs19 === errors;
        if (_valid0 && valid2) {
          valid2 = false;
          passing0 = [passing0, 2];
        } else {
          if (_valid0) {
            valid2 = true;
            passing0 = 2;
            if (props0 !== true) {
              props0 = true;
            }
          }
        }
      }
      if (!valid2) {
        const err24 = {
          instancePath: instancePath + '/target',
          schemaPath: '#/$defs/ModelTrainingTarget/oneOf',
          keyword: 'oneOf',
          params: { passingSchemas: passing0 },
          message: 'must match exactly one schema in oneOf',
        };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      } else {
        errors = _errs6;
        if (vErrors !== null) {
          if (_errs6) {
            vErrors.length = _errs6;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.validation_folds !== undefined) {
      let data6 = data.validation_folds;
      if (
        !(
          typeof data6 == 'number' &&
          !(data6 % 1) &&
          !isNaN(data6) &&
          isFinite(data6)
        )
      ) {
        const err25 = {
          instancePath: instancePath + '/validation_folds',
          schemaPath: '#/properties/validation_folds/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
      if (typeof data6 == 'number' && isFinite(data6)) {
        if (data6 > 4294967295 || isNaN(data6)) {
          const err26 = {
            instancePath: instancePath + '/validation_folds',
            schemaPath: '#/properties/validation_folds/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 4294967295 },
            message: 'must be <= 4294967295',
          };
          if (vErrors === null) {
            vErrors = [err26];
          } else {
            vErrors.push(err26);
          }
          errors++;
        }
        if (data6 < 0 || isNaN(data6)) {
          const err27 = {
            instancePath: instancePath + '/validation_folds',
            schemaPath: '#/properties/validation_folds/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: 0 },
            message: 'must be >= 0',
          };
          if (vErrors === null) {
            vErrors = [err27];
          } else {
            vErrors.push(err27);
          }
          errors++;
        }
      }
    }
  } else {
    const err28 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err28];
    } else {
      vErrors.push(err28);
    }
    errors++;
  }
  validate26.errors = vErrors;
  return errors === 0;
}
validate26.evaluated = {
  props: true,
  dynamicProps: false,
  dynamicItems: false,
};
function validate37(
  data,
  {
    instancePath = '',
    parentData,
    parentDataProperty,
    rootData = data,
    dynamicAnchors = {},
  } = {},
) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate37.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = undefined;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = undefined;
  }
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.name === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'name' },
        message: "must have required property '" + 'name' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.model_family === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'model_family' },
        message: "must have required property '" + 'model_family' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.prediction_horizon_secs === undefined) {
      const err2 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'prediction_horizon_secs' },
        message:
          "must have required property '" + 'prediction_horizon_secs' + "'",
      };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.thesis === undefined) {
      const err3 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'thesis' },
        message: "must have required property '" + 'thesis' + "'",
      };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.input_contract === undefined) {
      const err4 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'input_contract' },
        message: "must have required property '" + 'input_contract' + "'",
      };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.training_contract === undefined) {
      const err5 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'training_contract' },
        message: "must have required property '" + 'training_contract' + "'",
      };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.reason === undefined) {
      const err6 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'reason' },
        message: "must have required property '" + 'reason' + "'",
      };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func1.call(schema32.properties, key0)) {
        const err7 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.feature_schema_version !== undefined) {
      let data0 = data.feature_schema_version;
      if (
        !(
          typeof data0 == 'number' &&
          !(data0 % 1) &&
          !isNaN(data0) &&
          isFinite(data0)
        )
      ) {
        const err8 = {
          instancePath: instancePath + '/feature_schema_version',
          schemaPath: '#/$defs/SchemaVersion/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      if (typeof data0 == 'number' && isFinite(data0)) {
        if (data0 > 2147483647 || isNaN(data0)) {
          const err9 = {
            instancePath: instancePath + '/feature_schema_version',
            schemaPath: '#/$defs/SchemaVersion/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 2147483647 },
            message: 'must be <= 2147483647',
          };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data0 < -2147483648 || isNaN(data0)) {
          const err10 = {
            instancePath: instancePath + '/feature_schema_version',
            schemaPath: '#/$defs/SchemaVersion/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: -2147483648 },
            message: 'must be >= -2147483648',
          };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
      }
    }
    if (data.input_contract !== undefined) {
      if (
        !validate22(data.input_contract, {
          instancePath: instancePath + '/input_contract',
          parentData: data,
          parentDataProperty: 'input_contract',
          rootData,
          dynamicAnchors,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate22.errors
            : vErrors.concat(validate22.errors);
        errors = vErrors.length;
      }
    }
    if (data.label_schema_version !== undefined) {
      let data2 = data.label_schema_version;
      if (
        !(
          typeof data2 == 'number' &&
          !(data2 % 1) &&
          !isNaN(data2) &&
          isFinite(data2)
        )
      ) {
        const err11 = {
          instancePath: instancePath + '/label_schema_version',
          schemaPath: '#/$defs/SchemaVersion/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
      if (typeof data2 == 'number' && isFinite(data2)) {
        if (data2 > 2147483647 || isNaN(data2)) {
          const err12 = {
            instancePath: instancePath + '/label_schema_version',
            schemaPath: '#/$defs/SchemaVersion/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 2147483647 },
            message: 'must be <= 2147483647',
          };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        if (data2 < -2147483648 || isNaN(data2)) {
          const err13 = {
            instancePath: instancePath + '/label_schema_version',
            schemaPath: '#/$defs/SchemaVersion/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: -2147483648 },
            message: 'must be >= -2147483648',
          };
          if (vErrors === null) {
            vErrors = [err13];
          } else {
            vErrors.push(err13);
          }
          errors++;
        }
      }
    }
    if (data.model_family !== undefined) {
      let data3 = data.model_family;
      const _errs11 = errors;
      let valid4 = false;
      let passing0 = null;
      const _errs12 = errors;
      if (typeof data3 !== 'string') {
        const err14 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf/0/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
      if (
        !(
          data3 === 'weighted_factor' ||
          data3 === 'classical_gradient_boosted_trees' ||
          data3 === 'classical_random_forest' ||
          data3 === 'classical_extra_trees' ||
          data3 === 'classical_logistic_regression' ||
          data3 === 'classical_ridge' ||
          data3 === 'classical_lasso' ||
          data3 === 'classical_elastic_net'
        )
      ) {
        const err15 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf/0/enum',
          keyword: 'enum',
          params: { allowedValues: schema38.oneOf[0].enum },
          message: 'must be equal to one of the allowed values',
        };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
      var _valid0 = _errs12 === errors;
      if (_valid0) {
        valid4 = true;
        passing0 = 0;
      }
      const _errs14 = errors;
      if (typeof data3 !== 'string') {
        const err16 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf/1/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
      if ('hold_vs_exit_weighted' !== data3) {
        const err17 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf/1/const',
          keyword: 'const',
          params: { allowedValue: 'hold_vs_exit_weighted' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
      var _valid0 = _errs14 === errors;
      if (_valid0 && valid4) {
        valid4 = false;
        passing0 = [passing0, 1];
      } else {
        if (_valid0) {
          valid4 = true;
          passing0 = 1;
        }
      }
      if (!valid4) {
        const err18 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf',
          keyword: 'oneOf',
          params: { passingSchemas: passing0 },
          message: 'must match exactly one schema in oneOf',
        };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      } else {
        errors = _errs11;
        if (vErrors !== null) {
          if (_errs11) {
            vErrors.length = _errs11;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.name !== undefined) {
      let data4 = data.name;
      if (typeof data4 === 'string') {
        if (func2(data4) > 128) {
          const err19 = {
            instancePath: instancePath + '/name',
            schemaPath: '#/properties/name/maxLength',
            keyword: 'maxLength',
            params: { limit: 128 },
            message: 'must NOT have more than 128 characters',
          };
          if (vErrors === null) {
            vErrors = [err19];
          } else {
            vErrors.push(err19);
          }
          errors++;
        }
        if (func2(data4) < 1) {
          const err20 = {
            instancePath: instancePath + '/name',
            schemaPath: '#/properties/name/minLength',
            keyword: 'minLength',
            params: { limit: 1 },
            message: 'must NOT have fewer than 1 characters',
          };
          if (vErrors === null) {
            vErrors = [err20];
          } else {
            vErrors.push(err20);
          }
          errors++;
        }
      } else {
        const err21 = {
          instancePath: instancePath + '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.prediction_horizon_secs !== undefined) {
      let data5 = data.prediction_horizon_secs;
      if (
        !(
          typeof data5 == 'number' &&
          !(data5 % 1) &&
          !isNaN(data5) &&
          isFinite(data5)
        )
      ) {
        const err22 = {
          instancePath: instancePath + '/prediction_horizon_secs',
          schemaPath: '#/properties/prediction_horizon_secs/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
      if (typeof data5 == 'number' && isFinite(data5)) {
        if (data5 > 9007199254740991 || isNaN(data5)) {
          const err23 = {
            instancePath: instancePath + '/prediction_horizon_secs',
            schemaPath: '#/properties/prediction_horizon_secs/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 9007199254740991 },
            message: 'must be <= 9007199254740991',
          };
          if (vErrors === null) {
            vErrors = [err23];
          } else {
            vErrors.push(err23);
          }
          errors++;
        }
        if (data5 < 1 || isNaN(data5)) {
          const err24 = {
            instancePath: instancePath + '/prediction_horizon_secs',
            schemaPath: '#/properties/prediction_horizon_secs/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: 1 },
            message: 'must be >= 1',
          };
          if (vErrors === null) {
            vErrors = [err24];
          } else {
            vErrors.push(err24);
          }
          errors++;
        }
      }
    }
    if (data.reason !== undefined) {
      let data6 = data.reason;
      if (typeof data6 === 'string') {
        if (func2(data6) > 512) {
          const err25 = {
            instancePath: instancePath + '/reason',
            schemaPath: '#/properties/reason/maxLength',
            keyword: 'maxLength',
            params: { limit: 512 },
            message: 'must NOT have more than 512 characters',
          };
          if (vErrors === null) {
            vErrors = [err25];
          } else {
            vErrors.push(err25);
          }
          errors++;
        }
        if (func2(data6) < 1) {
          const err26 = {
            instancePath: instancePath + '/reason',
            schemaPath: '#/properties/reason/minLength',
            keyword: 'minLength',
            params: { limit: 1 },
            message: 'must NOT have fewer than 1 characters',
          };
          if (vErrors === null) {
            vErrors = [err26];
          } else {
            vErrors.push(err26);
          }
          errors++;
        }
      } else {
        const err27 = {
          instancePath: instancePath + '/reason',
          schemaPath: '#/properties/reason/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err27];
        } else {
          vErrors.push(err27);
        }
        errors++;
      }
    }
    if (data.thesis !== undefined) {
      let data7 = data.thesis;
      if (data7 && typeof data7 == 'object' && !Array.isArray(data7)) {
        if (data7.summary === undefined) {
          const err28 = {
            instancePath: instancePath + '/thesis',
            schemaPath: '#/$defs/ModelSpecThesis/required',
            keyword: 'required',
            params: { missingProperty: 'summary' },
            message: "must have required property '" + 'summary' + "'",
          };
          if (vErrors === null) {
            vErrors = [err28];
          } else {
            vErrors.push(err28);
          }
          errors++;
        }
        if (data7.hypothesis === undefined) {
          const err29 = {
            instancePath: instancePath + '/thesis',
            schemaPath: '#/$defs/ModelSpecThesis/required',
            keyword: 'required',
            params: { missingProperty: 'hypothesis' },
            message: "must have required property '" + 'hypothesis' + "'",
          };
          if (vErrors === null) {
            vErrors = [err29];
          } else {
            vErrors.push(err29);
          }
          errors++;
        }
        if (data7.limitations === undefined) {
          const err30 = {
            instancePath: instancePath + '/thesis',
            schemaPath: '#/$defs/ModelSpecThesis/required',
            keyword: 'required',
            params: { missingProperty: 'limitations' },
            message: "must have required property '" + 'limitations' + "'",
          };
          if (vErrors === null) {
            vErrors = [err30];
          } else {
            vErrors.push(err30);
          }
          errors++;
        }
        for (const key1 in data7) {
          if (
            !(
              key1 === 'hypothesis' ||
              key1 === 'limitations' ||
              key1 === 'summary'
            )
          ) {
            const err31 = {
              instancePath: instancePath + '/thesis',
              schemaPath: '#/$defs/ModelSpecThesis/additionalProperties',
              keyword: 'additionalProperties',
              params: { additionalProperty: key1 },
              message: 'must NOT have additional properties',
            };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
        if (data7.hypothesis !== undefined) {
          if (typeof data7.hypothesis !== 'string') {
            const err32 = {
              instancePath: instancePath + '/thesis/hypothesis',
              schemaPath: '#/$defs/ModelSpecThesis/properties/hypothesis/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            };
            if (vErrors === null) {
              vErrors = [err32];
            } else {
              vErrors.push(err32);
            }
            errors++;
          }
        }
        if (data7.limitations !== undefined) {
          let data9 = data7.limitations;
          if (Array.isArray(data9)) {
            const len0 = data9.length;
            for (let i0 = 0; i0 < len0; i0++) {
              if (typeof data9[i0] !== 'string') {
                const err33 = {
                  instancePath: instancePath + '/thesis/limitations/' + i0,
                  schemaPath:
                    '#/$defs/ModelSpecThesis/properties/limitations/items/type',
                  keyword: 'type',
                  params: { type: 'string' },
                  message: 'must be string',
                };
                if (vErrors === null) {
                  vErrors = [err33];
                } else {
                  vErrors.push(err33);
                }
                errors++;
              }
            }
          } else {
            const err34 = {
              instancePath: instancePath + '/thesis/limitations',
              schemaPath: '#/$defs/ModelSpecThesis/properties/limitations/type',
              keyword: 'type',
              params: { type: 'array' },
              message: 'must be array',
            };
            if (vErrors === null) {
              vErrors = [err34];
            } else {
              vErrors.push(err34);
            }
            errors++;
          }
        }
        if (data7.summary !== undefined) {
          if (typeof data7.summary !== 'string') {
            const err35 = {
              instancePath: instancePath + '/thesis/summary',
              schemaPath: '#/$defs/ModelSpecThesis/properties/summary/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            };
            if (vErrors === null) {
              vErrors = [err35];
            } else {
              vErrors.push(err35);
            }
            errors++;
          }
        }
      } else {
        const err36 = {
          instancePath: instancePath + '/thesis',
          schemaPath: '#/$defs/ModelSpecThesis/type',
          keyword: 'type',
          params: { type: 'object' },
          message: 'must be object',
        };
        if (vErrors === null) {
          vErrors = [err36];
        } else {
          vErrors.push(err36);
        }
        errors++;
      }
    }
    if (data.training_contract !== undefined) {
      if (
        !validate26(data.training_contract, {
          instancePath: instancePath + '/training_contract',
          parentData: data,
          parentDataProperty: 'training_contract',
          rootData,
          dynamicAnchors,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate26.errors
            : vErrors.concat(validate26.errors);
        errors = vErrors.length;
      }
    }
  } else {
    const err37 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err37];
    } else {
      vErrors.push(err37);
    }
    errors++;
  }
  validate37.errors = vErrors;
  return errors === 0;
}
validate37.evaluated = {
  props: true,
  dynamicProps: false,
  dynamicItems: false,
};
export const validateFeatureContract = validate40;
const schema42 = {
  description:
    'Active, hash-bound feature catalog used by model-spec authoring.',
  type: 'object',
  properties: {
    feature_schema_hash: { type: 'string', pattern: '^blake3:[0-9a-f]{64}$' },
    feature_schema_version: { $ref: '#/$defs/SchemaVersion' },
    features: {
      type: 'array',
      items: { $ref: '#/$defs/FeatureContractEntryView' },
    },
  },
  additionalProperties: false,
  required: ['feature_schema_hash', 'feature_schema_version', 'features'],
};
const pattern4 = new RegExp('^blake3:[0-9a-f]{64}$', 'u');
const schema44 = {
  description: 'One raw feature available to model input contracts.',
  type: 'object',
  properties: {
    compute_revision: { type: 'integer', minimum: 0, maximum: 4294967295 },
    family: { $ref: '#/$defs/FeatureFamily' },
    name: { type: 'string' },
    null_policy: { $ref: '#/$defs/FeatureNullPolicyView' },
    point_in_time_rule: { type: 'string' },
    source: { type: 'string' },
    staleness_policy: { type: 'string' },
    unit: { type: 'string' },
    value_kind: { $ref: '#/$defs/FeatureValueKind' },
  },
  additionalProperties: false,
  required: [
    'name',
    'compute_revision',
    'family',
    'value_kind',
    'unit',
    'null_policy',
    'source',
    'point_in_time_rule',
    'staleness_policy',
  ],
};
const schema45 = {
  description:
    'Supported feature families for v3 feature generation.\n\nOne family ≈ one feature-builder group. The set gates which groups the\nfeature plane computes (`features.enabled_feature_families`) and tags each\n`FeatureSpec` in the research schema registry, so config and the compute\nschema share a single, precise taxonomy.',
  oneOf: [
    {
      description:
        'Gamma market/event metadata (category, resolution timing, neg-risk, …).',
      type: 'string',
      const: 'market_metadata',
    },
    {
      description: 'Top-of-book price and depth structure.',
      type: 'string',
      const: 'price_book',
    },
    {
      description: 'Windowed return / volatility / momentum / trend features.',
      type: 'string',
      const: 'time_series',
    },
    {
      description:
        'Finalized execution-derived price, flow, intensity, and participant features.',
      type: 'string',
      const: 'trade',
    },
    {
      description:
        'Order-flow microstructure (quote rate, churn, queue depletion, …).',
      type: 'string',
      const: 'microstructure',
    },
    {
      description:
        'Prediction-market structural signals (neg-risk full-leg aggregates,\nshock/realized-vol windows, resolution-proximity, maker concentration).\nPlatform-computable from existing facts — no external data source.',
      type: 'string',
      const: 'structural',
    },
    {
      description:
        'Category-mapped external vertical slice (crypto underlying price, …).\nBuilt from `quant_domain_observation` + frozen market linkages; a market\nwhose category maps to no vertical carries no domain slice at all.',
      type: 'string',
      const: 'domain',
    },
  ],
};
const schema46 = {
  description: "Stable wire projection of one feature's missing-value policy.",
  type: 'object',
  properties: {
    policy: {
      description:
        'Policy name (`reject_market`, `neutral_value`, `penalize`, `optional`).',
      type: 'string',
    },
    value: {
      description: 'Exact decimal neutral value when `policy = neutral_value`.',
      type: ['string', 'null'],
    },
  },
  additionalProperties: false,
  required: ['policy'],
};
const schema47 = {
  description:
    'The dimensional kind of a present feature value.\n\nCarries a stable `i8` code persisted to `quant_feature_event.value_kind`.\nAppend-only contract: never renumber an existing variant.',
  oneOf: [
    {
      description: 'A dimensionless decimal.',
      type: 'string',
      const: 'decimal',
    },
    {
      description: 'A probability / confidence in `[0, 1]`.',
      type: 'string',
      const: 'probability',
    },
    { description: 'A basis-point quantity.', type: 'string', const: 'bps' },
    { description: 'A USD-denominated amount.', type: 'string', const: 'usd' },
    { description: 'A non-negative count.', type: 'string', const: 'count' },
    { description: 'A boolean flag.', type: 'string', const: 'bool' },
    {
      description:
        'A categorical market class (faithful enum; encoding is a downstream\nnormalization concern — never consumed as an ordinal number).',
      type: 'string',
      const: 'category',
    },
  ],
};
function validate30(
  data,
  {
    instancePath = '',
    parentData,
    parentDataProperty,
    rootData = data,
    dynamicAnchors = {},
  } = {},
) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate30.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = undefined;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = undefined;
  }
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.name === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'name' },
        message: "must have required property '" + 'name' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.compute_revision === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'compute_revision' },
        message: "must have required property '" + 'compute_revision' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.family === undefined) {
      const err2 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'family' },
        message: "must have required property '" + 'family' + "'",
      };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.value_kind === undefined) {
      const err3 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'value_kind' },
        message: "must have required property '" + 'value_kind' + "'",
      };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.unit === undefined) {
      const err4 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'unit' },
        message: "must have required property '" + 'unit' + "'",
      };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.null_policy === undefined) {
      const err5 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'null_policy' },
        message: "must have required property '" + 'null_policy' + "'",
      };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.source === undefined) {
      const err6 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'source' },
        message: "must have required property '" + 'source' + "'",
      };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data.point_in_time_rule === undefined) {
      const err7 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'point_in_time_rule' },
        message: "must have required property '" + 'point_in_time_rule' + "'",
      };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    if (data.staleness_policy === undefined) {
      const err8 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'staleness_policy' },
        message: "must have required property '" + 'staleness_policy' + "'",
      };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func1.call(schema44.properties, key0)) {
        const err9 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.compute_revision !== undefined) {
      let data0 = data.compute_revision;
      if (
        !(
          typeof data0 == 'number' &&
          !(data0 % 1) &&
          !isNaN(data0) &&
          isFinite(data0)
        )
      ) {
        const err10 = {
          instancePath: instancePath + '/compute_revision',
          schemaPath: '#/properties/compute_revision/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
      if (typeof data0 == 'number' && isFinite(data0)) {
        if (data0 > 4294967295 || isNaN(data0)) {
          const err11 = {
            instancePath: instancePath + '/compute_revision',
            schemaPath: '#/properties/compute_revision/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 4294967295 },
            message: 'must be <= 4294967295',
          };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        if (data0 < 0 || isNaN(data0)) {
          const err12 = {
            instancePath: instancePath + '/compute_revision',
            schemaPath: '#/properties/compute_revision/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: 0 },
            message: 'must be >= 0',
          };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
      }
    }
    if (data.family !== undefined) {
      let data1 = data.family;
      const _errs6 = errors;
      let valid2 = false;
      let passing0 = null;
      const _errs7 = errors;
      if (typeof data1 !== 'string') {
        const err13 = {
          instancePath: instancePath + '/family',
          schemaPath: '#/$defs/FeatureFamily/oneOf/0/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
      if ('market_metadata' !== data1) {
        const err14 = {
          instancePath: instancePath + '/family',
          schemaPath: '#/$defs/FeatureFamily/oneOf/0/const',
          keyword: 'const',
          params: { allowedValue: 'market_metadata' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
      var _valid0 = _errs7 === errors;
      if (_valid0) {
        valid2 = true;
        passing0 = 0;
      }
      const _errs9 = errors;
      if (typeof data1 !== 'string') {
        const err15 = {
          instancePath: instancePath + '/family',
          schemaPath: '#/$defs/FeatureFamily/oneOf/1/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
      if ('price_book' !== data1) {
        const err16 = {
          instancePath: instancePath + '/family',
          schemaPath: '#/$defs/FeatureFamily/oneOf/1/const',
          keyword: 'const',
          params: { allowedValue: 'price_book' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
      var _valid0 = _errs9 === errors;
      if (_valid0 && valid2) {
        valid2 = false;
        passing0 = [passing0, 1];
      } else {
        if (_valid0) {
          valid2 = true;
          passing0 = 1;
        }
        const _errs11 = errors;
        if (typeof data1 !== 'string') {
          const err17 = {
            instancePath: instancePath + '/family',
            schemaPath: '#/$defs/FeatureFamily/oneOf/2/type',
            keyword: 'type',
            params: { type: 'string' },
            message: 'must be string',
          };
          if (vErrors === null) {
            vErrors = [err17];
          } else {
            vErrors.push(err17);
          }
          errors++;
        }
        if ('time_series' !== data1) {
          const err18 = {
            instancePath: instancePath + '/family',
            schemaPath: '#/$defs/FeatureFamily/oneOf/2/const',
            keyword: 'const',
            params: { allowedValue: 'time_series' },
            message: 'must be equal to constant',
          };
          if (vErrors === null) {
            vErrors = [err18];
          } else {
            vErrors.push(err18);
          }
          errors++;
        }
        var _valid0 = _errs11 === errors;
        if (_valid0 && valid2) {
          valid2 = false;
          passing0 = [passing0, 2];
        } else {
          if (_valid0) {
            valid2 = true;
            passing0 = 2;
          }
          const _errs13 = errors;
          if (typeof data1 !== 'string') {
            const err19 = {
              instancePath: instancePath + '/family',
              schemaPath: '#/$defs/FeatureFamily/oneOf/3/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
          if ('trade' !== data1) {
            const err20 = {
              instancePath: instancePath + '/family',
              schemaPath: '#/$defs/FeatureFamily/oneOf/3/const',
              keyword: 'const',
              params: { allowedValue: 'trade' },
              message: 'must be equal to constant',
            };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
          var _valid0 = _errs13 === errors;
          if (_valid0 && valid2) {
            valid2 = false;
            passing0 = [passing0, 3];
          } else {
            if (_valid0) {
              valid2 = true;
              passing0 = 3;
            }
            const _errs15 = errors;
            if (typeof data1 !== 'string') {
              const err21 = {
                instancePath: instancePath + '/family',
                schemaPath: '#/$defs/FeatureFamily/oneOf/4/type',
                keyword: 'type',
                params: { type: 'string' },
                message: 'must be string',
              };
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
            if ('microstructure' !== data1) {
              const err22 = {
                instancePath: instancePath + '/family',
                schemaPath: '#/$defs/FeatureFamily/oneOf/4/const',
                keyword: 'const',
                params: { allowedValue: 'microstructure' },
                message: 'must be equal to constant',
              };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
            var _valid0 = _errs15 === errors;
            if (_valid0 && valid2) {
              valid2 = false;
              passing0 = [passing0, 4];
            } else {
              if (_valid0) {
                valid2 = true;
                passing0 = 4;
              }
              const _errs17 = errors;
              if (typeof data1 !== 'string') {
                const err23 = {
                  instancePath: instancePath + '/family',
                  schemaPath: '#/$defs/FeatureFamily/oneOf/5/type',
                  keyword: 'type',
                  params: { type: 'string' },
                  message: 'must be string',
                };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
              if ('structural' !== data1) {
                const err24 = {
                  instancePath: instancePath + '/family',
                  schemaPath: '#/$defs/FeatureFamily/oneOf/5/const',
                  keyword: 'const',
                  params: { allowedValue: 'structural' },
                  message: 'must be equal to constant',
                };
                if (vErrors === null) {
                  vErrors = [err24];
                } else {
                  vErrors.push(err24);
                }
                errors++;
              }
              var _valid0 = _errs17 === errors;
              if (_valid0 && valid2) {
                valid2 = false;
                passing0 = [passing0, 5];
              } else {
                if (_valid0) {
                  valid2 = true;
                  passing0 = 5;
                }
                const _errs19 = errors;
                if (typeof data1 !== 'string') {
                  const err25 = {
                    instancePath: instancePath + '/family',
                    schemaPath: '#/$defs/FeatureFamily/oneOf/6/type',
                    keyword: 'type',
                    params: { type: 'string' },
                    message: 'must be string',
                  };
                  if (vErrors === null) {
                    vErrors = [err25];
                  } else {
                    vErrors.push(err25);
                  }
                  errors++;
                }
                if ('domain' !== data1) {
                  const err26 = {
                    instancePath: instancePath + '/family',
                    schemaPath: '#/$defs/FeatureFamily/oneOf/6/const',
                    keyword: 'const',
                    params: { allowedValue: 'domain' },
                    message: 'must be equal to constant',
                  };
                  if (vErrors === null) {
                    vErrors = [err26];
                  } else {
                    vErrors.push(err26);
                  }
                  errors++;
                }
                var _valid0 = _errs19 === errors;
                if (_valid0 && valid2) {
                  valid2 = false;
                  passing0 = [passing0, 6];
                } else {
                  if (_valid0) {
                    valid2 = true;
                    passing0 = 6;
                  }
                }
              }
            }
          }
        }
      }
      if (!valid2) {
        const err27 = {
          instancePath: instancePath + '/family',
          schemaPath: '#/$defs/FeatureFamily/oneOf',
          keyword: 'oneOf',
          params: { passingSchemas: passing0 },
          message: 'must match exactly one schema in oneOf',
        };
        if (vErrors === null) {
          vErrors = [err27];
        } else {
          vErrors.push(err27);
        }
        errors++;
      } else {
        errors = _errs6;
        if (vErrors !== null) {
          if (_errs6) {
            vErrors.length = _errs6;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        const err28 = {
          instancePath: instancePath + '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      }
    }
    if (data.null_policy !== undefined) {
      let data3 = data.null_policy;
      if (data3 && typeof data3 == 'object' && !Array.isArray(data3)) {
        if (data3.policy === undefined) {
          const err29 = {
            instancePath: instancePath + '/null_policy',
            schemaPath: '#/$defs/FeatureNullPolicyView/required',
            keyword: 'required',
            params: { missingProperty: 'policy' },
            message: "must have required property '" + 'policy' + "'",
          };
          if (vErrors === null) {
            vErrors = [err29];
          } else {
            vErrors.push(err29);
          }
          errors++;
        }
        for (const key1 in data3) {
          if (!(key1 === 'policy' || key1 === 'value')) {
            const err30 = {
              instancePath: instancePath + '/null_policy',
              schemaPath: '#/$defs/FeatureNullPolicyView/additionalProperties',
              keyword: 'additionalProperties',
              params: { additionalProperty: key1 },
              message: 'must NOT have additional properties',
            };
            if (vErrors === null) {
              vErrors = [err30];
            } else {
              vErrors.push(err30);
            }
            errors++;
          }
        }
        if (data3.policy !== undefined) {
          if (typeof data3.policy !== 'string') {
            const err31 = {
              instancePath: instancePath + '/null_policy/policy',
              schemaPath:
                '#/$defs/FeatureNullPolicyView/properties/policy/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
        if (data3.value !== undefined) {
          let data5 = data3.value;
          if (typeof data5 !== 'string' && data5 !== null) {
            const err32 = {
              instancePath: instancePath + '/null_policy/value',
              schemaPath: '#/$defs/FeatureNullPolicyView/properties/value/type',
              keyword: 'type',
              params: { type: schema46.properties.value.type },
              message: 'must be string,null',
            };
            if (vErrors === null) {
              vErrors = [err32];
            } else {
              vErrors.push(err32);
            }
            errors++;
          }
        }
      } else {
        const err33 = {
          instancePath: instancePath + '/null_policy',
          schemaPath: '#/$defs/FeatureNullPolicyView/type',
          keyword: 'type',
          params: { type: 'object' },
          message: 'must be object',
        };
        if (vErrors === null) {
          vErrors = [err33];
        } else {
          vErrors.push(err33);
        }
        errors++;
      }
    }
    if (data.point_in_time_rule !== undefined) {
      if (typeof data.point_in_time_rule !== 'string') {
        const err34 = {
          instancePath: instancePath + '/point_in_time_rule',
          schemaPath: '#/properties/point_in_time_rule/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err34];
        } else {
          vErrors.push(err34);
        }
        errors++;
      }
    }
    if (data.source !== undefined) {
      if (typeof data.source !== 'string') {
        const err35 = {
          instancePath: instancePath + '/source',
          schemaPath: '#/properties/source/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err35];
        } else {
          vErrors.push(err35);
        }
        errors++;
      }
    }
    if (data.staleness_policy !== undefined) {
      if (typeof data.staleness_policy !== 'string') {
        const err36 = {
          instancePath: instancePath + '/staleness_policy',
          schemaPath: '#/properties/staleness_policy/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err36];
        } else {
          vErrors.push(err36);
        }
        errors++;
      }
    }
    if (data.unit !== undefined) {
      if (typeof data.unit !== 'string') {
        const err37 = {
          instancePath: instancePath + '/unit',
          schemaPath: '#/properties/unit/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err37];
        } else {
          vErrors.push(err37);
        }
        errors++;
      }
    }
    if (data.value_kind !== undefined) {
      let data10 = data.value_kind;
      const _errs41 = errors;
      let valid6 = false;
      let passing1 = null;
      const _errs42 = errors;
      if (typeof data10 !== 'string') {
        const err38 = {
          instancePath: instancePath + '/value_kind',
          schemaPath: '#/$defs/FeatureValueKind/oneOf/0/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err38];
        } else {
          vErrors.push(err38);
        }
        errors++;
      }
      if ('decimal' !== data10) {
        const err39 = {
          instancePath: instancePath + '/value_kind',
          schemaPath: '#/$defs/FeatureValueKind/oneOf/0/const',
          keyword: 'const',
          params: { allowedValue: 'decimal' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err39];
        } else {
          vErrors.push(err39);
        }
        errors++;
      }
      var _valid1 = _errs42 === errors;
      if (_valid1) {
        valid6 = true;
        passing1 = 0;
      }
      const _errs44 = errors;
      if (typeof data10 !== 'string') {
        const err40 = {
          instancePath: instancePath + '/value_kind',
          schemaPath: '#/$defs/FeatureValueKind/oneOf/1/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err40];
        } else {
          vErrors.push(err40);
        }
        errors++;
      }
      if ('probability' !== data10) {
        const err41 = {
          instancePath: instancePath + '/value_kind',
          schemaPath: '#/$defs/FeatureValueKind/oneOf/1/const',
          keyword: 'const',
          params: { allowedValue: 'probability' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err41];
        } else {
          vErrors.push(err41);
        }
        errors++;
      }
      var _valid1 = _errs44 === errors;
      if (_valid1 && valid6) {
        valid6 = false;
        passing1 = [passing1, 1];
      } else {
        if (_valid1) {
          valid6 = true;
          passing1 = 1;
        }
        const _errs46 = errors;
        if (typeof data10 !== 'string') {
          const err42 = {
            instancePath: instancePath + '/value_kind',
            schemaPath: '#/$defs/FeatureValueKind/oneOf/2/type',
            keyword: 'type',
            params: { type: 'string' },
            message: 'must be string',
          };
          if (vErrors === null) {
            vErrors = [err42];
          } else {
            vErrors.push(err42);
          }
          errors++;
        }
        if ('bps' !== data10) {
          const err43 = {
            instancePath: instancePath + '/value_kind',
            schemaPath: '#/$defs/FeatureValueKind/oneOf/2/const',
            keyword: 'const',
            params: { allowedValue: 'bps' },
            message: 'must be equal to constant',
          };
          if (vErrors === null) {
            vErrors = [err43];
          } else {
            vErrors.push(err43);
          }
          errors++;
        }
        var _valid1 = _errs46 === errors;
        if (_valid1 && valid6) {
          valid6 = false;
          passing1 = [passing1, 2];
        } else {
          if (_valid1) {
            valid6 = true;
            passing1 = 2;
          }
          const _errs48 = errors;
          if (typeof data10 !== 'string') {
            const err44 = {
              instancePath: instancePath + '/value_kind',
              schemaPath: '#/$defs/FeatureValueKind/oneOf/3/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            };
            if (vErrors === null) {
              vErrors = [err44];
            } else {
              vErrors.push(err44);
            }
            errors++;
          }
          if ('usd' !== data10) {
            const err45 = {
              instancePath: instancePath + '/value_kind',
              schemaPath: '#/$defs/FeatureValueKind/oneOf/3/const',
              keyword: 'const',
              params: { allowedValue: 'usd' },
              message: 'must be equal to constant',
            };
            if (vErrors === null) {
              vErrors = [err45];
            } else {
              vErrors.push(err45);
            }
            errors++;
          }
          var _valid1 = _errs48 === errors;
          if (_valid1 && valid6) {
            valid6 = false;
            passing1 = [passing1, 3];
          } else {
            if (_valid1) {
              valid6 = true;
              passing1 = 3;
            }
            const _errs50 = errors;
            if (typeof data10 !== 'string') {
              const err46 = {
                instancePath: instancePath + '/value_kind',
                schemaPath: '#/$defs/FeatureValueKind/oneOf/4/type',
                keyword: 'type',
                params: { type: 'string' },
                message: 'must be string',
              };
              if (vErrors === null) {
                vErrors = [err46];
              } else {
                vErrors.push(err46);
              }
              errors++;
            }
            if ('count' !== data10) {
              const err47 = {
                instancePath: instancePath + '/value_kind',
                schemaPath: '#/$defs/FeatureValueKind/oneOf/4/const',
                keyword: 'const',
                params: { allowedValue: 'count' },
                message: 'must be equal to constant',
              };
              if (vErrors === null) {
                vErrors = [err47];
              } else {
                vErrors.push(err47);
              }
              errors++;
            }
            var _valid1 = _errs50 === errors;
            if (_valid1 && valid6) {
              valid6 = false;
              passing1 = [passing1, 4];
            } else {
              if (_valid1) {
                valid6 = true;
                passing1 = 4;
              }
              const _errs52 = errors;
              if (typeof data10 !== 'string') {
                const err48 = {
                  instancePath: instancePath + '/value_kind',
                  schemaPath: '#/$defs/FeatureValueKind/oneOf/5/type',
                  keyword: 'type',
                  params: { type: 'string' },
                  message: 'must be string',
                };
                if (vErrors === null) {
                  vErrors = [err48];
                } else {
                  vErrors.push(err48);
                }
                errors++;
              }
              if ('bool' !== data10) {
                const err49 = {
                  instancePath: instancePath + '/value_kind',
                  schemaPath: '#/$defs/FeatureValueKind/oneOf/5/const',
                  keyword: 'const',
                  params: { allowedValue: 'bool' },
                  message: 'must be equal to constant',
                };
                if (vErrors === null) {
                  vErrors = [err49];
                } else {
                  vErrors.push(err49);
                }
                errors++;
              }
              var _valid1 = _errs52 === errors;
              if (_valid1 && valid6) {
                valid6 = false;
                passing1 = [passing1, 5];
              } else {
                if (_valid1) {
                  valid6 = true;
                  passing1 = 5;
                }
                const _errs54 = errors;
                if (typeof data10 !== 'string') {
                  const err50 = {
                    instancePath: instancePath + '/value_kind',
                    schemaPath: '#/$defs/FeatureValueKind/oneOf/6/type',
                    keyword: 'type',
                    params: { type: 'string' },
                    message: 'must be string',
                  };
                  if (vErrors === null) {
                    vErrors = [err50];
                  } else {
                    vErrors.push(err50);
                  }
                  errors++;
                }
                if ('category' !== data10) {
                  const err51 = {
                    instancePath: instancePath + '/value_kind',
                    schemaPath: '#/$defs/FeatureValueKind/oneOf/6/const',
                    keyword: 'const',
                    params: { allowedValue: 'category' },
                    message: 'must be equal to constant',
                  };
                  if (vErrors === null) {
                    vErrors = [err51];
                  } else {
                    vErrors.push(err51);
                  }
                  errors++;
                }
                var _valid1 = _errs54 === errors;
                if (_valid1 && valid6) {
                  valid6 = false;
                  passing1 = [passing1, 6];
                } else {
                  if (_valid1) {
                    valid6 = true;
                    passing1 = 6;
                  }
                }
              }
            }
          }
        }
      }
      if (!valid6) {
        const err52 = {
          instancePath: instancePath + '/value_kind',
          schemaPath: '#/$defs/FeatureValueKind/oneOf',
          keyword: 'oneOf',
          params: { passingSchemas: passing1 },
          message: 'must match exactly one schema in oneOf',
        };
        if (vErrors === null) {
          vErrors = [err52];
        } else {
          vErrors.push(err52);
        }
        errors++;
      } else {
        errors = _errs41;
        if (vErrors !== null) {
          if (_errs41) {
            vErrors.length = _errs41;
          } else {
            vErrors = null;
          }
        }
      }
    }
  } else {
    const err53 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err53];
    } else {
      vErrors.push(err53);
    }
    errors++;
  }
  validate30.errors = vErrors;
  return errors === 0;
}
validate30.evaluated = {
  props: true,
  dynamicProps: false,
  dynamicItems: false,
};
function validate40(
  data,
  {
    instancePath = '',
    parentData,
    parentDataProperty,
    rootData = data,
    dynamicAnchors = {},
  } = {},
) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate40.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = undefined;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = undefined;
  }
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.feature_schema_hash === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'feature_schema_hash' },
        message: "must have required property '" + 'feature_schema_hash' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.feature_schema_version === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'feature_schema_version' },
        message:
          "must have required property '" + 'feature_schema_version' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.features === undefined) {
      const err2 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'features' },
        message: "must have required property '" + 'features' + "'",
      };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (
        !(
          key0 === 'feature_schema_hash' ||
          key0 === 'feature_schema_version' ||
          key0 === 'features'
        )
      ) {
        const err3 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.feature_schema_hash !== undefined) {
      let data0 = data.feature_schema_hash;
      if (typeof data0 === 'string') {
        if (!pattern4.test(data0)) {
          const err4 = {
            instancePath: instancePath + '/feature_schema_hash',
            schemaPath: '#/properties/feature_schema_hash/pattern',
            keyword: 'pattern',
            params: { pattern: '^blake3:[0-9a-f]{64}$' },
            message: 'must match pattern "' + '^blake3:[0-9a-f]{64}$' + '"',
          };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = {
          instancePath: instancePath + '/feature_schema_hash',
          schemaPath: '#/properties/feature_schema_hash/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.feature_schema_version !== undefined) {
      let data1 = data.feature_schema_version;
      if (
        !(
          typeof data1 == 'number' &&
          !(data1 % 1) &&
          !isNaN(data1) &&
          isFinite(data1)
        )
      ) {
        const err6 = {
          instancePath: instancePath + '/feature_schema_version',
          schemaPath: '#/$defs/SchemaVersion/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if (typeof data1 == 'number' && isFinite(data1)) {
        if (data1 > 2147483647 || isNaN(data1)) {
          const err7 = {
            instancePath: instancePath + '/feature_schema_version',
            schemaPath: '#/$defs/SchemaVersion/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 2147483647 },
            message: 'must be <= 2147483647',
          };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
        if (data1 < -2147483648 || isNaN(data1)) {
          const err8 = {
            instancePath: instancePath + '/feature_schema_version',
            schemaPath: '#/$defs/SchemaVersion/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: -2147483648 },
            message: 'must be >= -2147483648',
          };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      }
    }
    if (data.features !== undefined) {
      let data2 = data.features;
      if (Array.isArray(data2)) {
        const len0 = data2.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate30(data2[i0], {
              instancePath: instancePath + '/features/' + i0,
              parentData: data2,
              parentDataProperty: i0,
              rootData,
              dynamicAnchors,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate30.errors
                : vErrors.concat(validate30.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err9 = {
          instancePath: instancePath + '/features',
          schemaPath: '#/properties/features/type',
          keyword: 'type',
          params: { type: 'array' },
          message: 'must be array',
        };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
  } else {
    const err10 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  validate40.errors = vErrors;
  return errors === 0;
}
validate40.evaluated = {
  props: true,
  dynamicProps: false,
  dynamicItems: false,
};
export const validateModelSpec = validate42;
const schema48 = {
  description:
    'Outbound projection for a model specification row (the training entry point:\nthe operator picks a spec before planning a dataset or training a version).',
  type: 'object',
  properties: {
    created_at: { type: 'string', format: 'date-time' },
    created_by_label: { type: 'string' },
    created_by_role: { type: ['string', 'null'] },
    created_by_user_id: { type: ['string', 'null'], format: 'uuid' },
    definition_hash: { type: 'string', pattern: '^blake3:[0-9a-f]{64}$' },
    feature_schema_version: { $ref: '#/$defs/SchemaVersion' },
    input_contract: { $ref: '#/$defs/ModelInputContract' },
    label_schema_version: { $ref: '#/$defs/SchemaVersion' },
    model_family: { $ref: '#/$defs/ModelFamily' },
    model_spec_id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    prediction_horizon_secs: {
      type: 'integer',
      minimum: -9007199254740991,
      maximum: 9007199254740991,
    },
    reason: { type: 'string' },
    thesis: { $ref: '#/$defs/ModelSpecThesis' },
    training_contract: { $ref: '#/$defs/ModelTrainingContract' },
  },
  additionalProperties: false,
  required: [
    'model_spec_id',
    'name',
    'model_family',
    'prediction_horizon_secs',
    'feature_schema_version',
    'label_schema_version',
    'thesis',
    'input_contract',
    'training_contract',
    'definition_hash',
    'created_by_label',
    'reason',
    'created_at',
  ],
};
const formats2 = fullFormats['date-time'];
function validate42(
  data,
  {
    instancePath = '',
    parentData,
    parentDataProperty,
    rootData = data,
    dynamicAnchors = {},
  } = {},
) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate42.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = undefined;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = undefined;
  }
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.model_spec_id === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'model_spec_id' },
        message: "must have required property '" + 'model_spec_id' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.name === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'name' },
        message: "must have required property '" + 'name' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.model_family === undefined) {
      const err2 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'model_family' },
        message: "must have required property '" + 'model_family' + "'",
      };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.prediction_horizon_secs === undefined) {
      const err3 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'prediction_horizon_secs' },
        message:
          "must have required property '" + 'prediction_horizon_secs' + "'",
      };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.feature_schema_version === undefined) {
      const err4 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'feature_schema_version' },
        message:
          "must have required property '" + 'feature_schema_version' + "'",
      };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.label_schema_version === undefined) {
      const err5 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'label_schema_version' },
        message: "must have required property '" + 'label_schema_version' + "'",
      };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.thesis === undefined) {
      const err6 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'thesis' },
        message: "must have required property '" + 'thesis' + "'",
      };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data.input_contract === undefined) {
      const err7 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'input_contract' },
        message: "must have required property '" + 'input_contract' + "'",
      };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    if (data.training_contract === undefined) {
      const err8 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'training_contract' },
        message: "must have required property '" + 'training_contract' + "'",
      };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.definition_hash === undefined) {
      const err9 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'definition_hash' },
        message: "must have required property '" + 'definition_hash' + "'",
      };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    if (data.created_by_label === undefined) {
      const err10 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'created_by_label' },
        message: "must have required property '" + 'created_by_label' + "'",
      };
      if (vErrors === null) {
        vErrors = [err10];
      } else {
        vErrors.push(err10);
      }
      errors++;
    }
    if (data.reason === undefined) {
      const err11 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'reason' },
        message: "must have required property '" + 'reason' + "'",
      };
      if (vErrors === null) {
        vErrors = [err11];
      } else {
        vErrors.push(err11);
      }
      errors++;
    }
    if (data.created_at === undefined) {
      const err12 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'created_at' },
        message: "must have required property '" + 'created_at' + "'",
      };
      if (vErrors === null) {
        vErrors = [err12];
      } else {
        vErrors.push(err12);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func1.call(schema48.properties, key0)) {
        const err13 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.created_at !== undefined) {
      let data0 = data.created_at;
      if (typeof data0 === 'string') {
        if (!formats2.validate(data0)) {
          const err14 = {
            instancePath: instancePath + '/created_at',
            schemaPath: '#/properties/created_at/format',
            keyword: 'format',
            params: { format: 'date-time' },
            message: 'must match format "' + 'date-time' + '"',
          };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
      } else {
        const err15 = {
          instancePath: instancePath + '/created_at',
          schemaPath: '#/properties/created_at/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.created_by_label !== undefined) {
      if (typeof data.created_by_label !== 'string') {
        const err16 = {
          instancePath: instancePath + '/created_by_label',
          schemaPath: '#/properties/created_by_label/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.created_by_role !== undefined) {
      let data2 = data.created_by_role;
      if (typeof data2 !== 'string' && data2 !== null) {
        const err17 = {
          instancePath: instancePath + '/created_by_role',
          schemaPath: '#/properties/created_by_role/type',
          keyword: 'type',
          params: { type: schema48.properties.created_by_role.type },
          message: 'must be string,null',
        };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.created_by_user_id !== undefined) {
      let data3 = data.created_by_user_id;
      if (typeof data3 !== 'string' && data3 !== null) {
        const err18 = {
          instancePath: instancePath + '/created_by_user_id',
          schemaPath: '#/properties/created_by_user_id/type',
          keyword: 'type',
          params: { type: schema48.properties.created_by_user_id.type },
          message: 'must be string,null',
        };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
      if (typeof data3 === 'string') {
        if (!formats0.test(data3)) {
          const err19 = {
            instancePath: instancePath + '/created_by_user_id',
            schemaPath: '#/properties/created_by_user_id/format',
            keyword: 'format',
            params: { format: 'uuid' },
            message: 'must match format "' + 'uuid' + '"',
          };
          if (vErrors === null) {
            vErrors = [err19];
          } else {
            vErrors.push(err19);
          }
          errors++;
        }
      }
    }
    if (data.definition_hash !== undefined) {
      let data4 = data.definition_hash;
      if (typeof data4 === 'string') {
        if (!pattern4.test(data4)) {
          const err20 = {
            instancePath: instancePath + '/definition_hash',
            schemaPath: '#/properties/definition_hash/pattern',
            keyword: 'pattern',
            params: { pattern: '^blake3:[0-9a-f]{64}$' },
            message: 'must match pattern "' + '^blake3:[0-9a-f]{64}$' + '"',
          };
          if (vErrors === null) {
            vErrors = [err20];
          } else {
            vErrors.push(err20);
          }
          errors++;
        }
      } else {
        const err21 = {
          instancePath: instancePath + '/definition_hash',
          schemaPath: '#/properties/definition_hash/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.feature_schema_version !== undefined) {
      let data5 = data.feature_schema_version;
      if (
        !(
          typeof data5 == 'number' &&
          !(data5 % 1) &&
          !isNaN(data5) &&
          isFinite(data5)
        )
      ) {
        const err22 = {
          instancePath: instancePath + '/feature_schema_version',
          schemaPath: '#/$defs/SchemaVersion/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
      if (typeof data5 == 'number' && isFinite(data5)) {
        if (data5 > 2147483647 || isNaN(data5)) {
          const err23 = {
            instancePath: instancePath + '/feature_schema_version',
            schemaPath: '#/$defs/SchemaVersion/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 2147483647 },
            message: 'must be <= 2147483647',
          };
          if (vErrors === null) {
            vErrors = [err23];
          } else {
            vErrors.push(err23);
          }
          errors++;
        }
        if (data5 < -2147483648 || isNaN(data5)) {
          const err24 = {
            instancePath: instancePath + '/feature_schema_version',
            schemaPath: '#/$defs/SchemaVersion/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: -2147483648 },
            message: 'must be >= -2147483648',
          };
          if (vErrors === null) {
            vErrors = [err24];
          } else {
            vErrors.push(err24);
          }
          errors++;
        }
      }
    }
    if (data.input_contract !== undefined) {
      if (
        !validate22(data.input_contract, {
          instancePath: instancePath + '/input_contract',
          parentData: data,
          parentDataProperty: 'input_contract',
          rootData,
          dynamicAnchors,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate22.errors
            : vErrors.concat(validate22.errors);
        errors = vErrors.length;
      }
    }
    if (data.label_schema_version !== undefined) {
      let data7 = data.label_schema_version;
      if (
        !(
          typeof data7 == 'number' &&
          !(data7 % 1) &&
          !isNaN(data7) &&
          isFinite(data7)
        )
      ) {
        const err25 = {
          instancePath: instancePath + '/label_schema_version',
          schemaPath: '#/$defs/SchemaVersion/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
      if (typeof data7 == 'number' && isFinite(data7)) {
        if (data7 > 2147483647 || isNaN(data7)) {
          const err26 = {
            instancePath: instancePath + '/label_schema_version',
            schemaPath: '#/$defs/SchemaVersion/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 2147483647 },
            message: 'must be <= 2147483647',
          };
          if (vErrors === null) {
            vErrors = [err26];
          } else {
            vErrors.push(err26);
          }
          errors++;
        }
        if (data7 < -2147483648 || isNaN(data7)) {
          const err27 = {
            instancePath: instancePath + '/label_schema_version',
            schemaPath: '#/$defs/SchemaVersion/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: -2147483648 },
            message: 'must be >= -2147483648',
          };
          if (vErrors === null) {
            vErrors = [err27];
          } else {
            vErrors.push(err27);
          }
          errors++;
        }
      }
    }
    if (data.model_family !== undefined) {
      let data8 = data.model_family;
      const _errs21 = errors;
      let valid4 = false;
      let passing0 = null;
      const _errs22 = errors;
      if (typeof data8 !== 'string') {
        const err28 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf/0/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err28];
        } else {
          vErrors.push(err28);
        }
        errors++;
      }
      if (
        !(
          data8 === 'weighted_factor' ||
          data8 === 'classical_gradient_boosted_trees' ||
          data8 === 'classical_random_forest' ||
          data8 === 'classical_extra_trees' ||
          data8 === 'classical_logistic_regression' ||
          data8 === 'classical_ridge' ||
          data8 === 'classical_lasso' ||
          data8 === 'classical_elastic_net'
        )
      ) {
        const err29 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf/0/enum',
          keyword: 'enum',
          params: { allowedValues: schema38.oneOf[0].enum },
          message: 'must be equal to one of the allowed values',
        };
        if (vErrors === null) {
          vErrors = [err29];
        } else {
          vErrors.push(err29);
        }
        errors++;
      }
      var _valid0 = _errs22 === errors;
      if (_valid0) {
        valid4 = true;
        passing0 = 0;
      }
      const _errs24 = errors;
      if (typeof data8 !== 'string') {
        const err30 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf/1/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err30];
        } else {
          vErrors.push(err30);
        }
        errors++;
      }
      if ('hold_vs_exit_weighted' !== data8) {
        const err31 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf/1/const',
          keyword: 'const',
          params: { allowedValue: 'hold_vs_exit_weighted' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err31];
        } else {
          vErrors.push(err31);
        }
        errors++;
      }
      var _valid0 = _errs24 === errors;
      if (_valid0 && valid4) {
        valid4 = false;
        passing0 = [passing0, 1];
      } else {
        if (_valid0) {
          valid4 = true;
          passing0 = 1;
        }
      }
      if (!valid4) {
        const err32 = {
          instancePath: instancePath + '/model_family',
          schemaPath: '#/$defs/ModelFamily/oneOf',
          keyword: 'oneOf',
          params: { passingSchemas: passing0 },
          message: 'must match exactly one schema in oneOf',
        };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      } else {
        errors = _errs21;
        if (vErrors !== null) {
          if (_errs21) {
            vErrors.length = _errs21;
          } else {
            vErrors = null;
          }
        }
      }
    }
    if (data.model_spec_id !== undefined) {
      let data9 = data.model_spec_id;
      if (typeof data9 === 'string') {
        if (!formats0.test(data9)) {
          const err33 = {
            instancePath: instancePath + '/model_spec_id',
            schemaPath: '#/properties/model_spec_id/format',
            keyword: 'format',
            params: { format: 'uuid' },
            message: 'must match format "' + 'uuid' + '"',
          };
          if (vErrors === null) {
            vErrors = [err33];
          } else {
            vErrors.push(err33);
          }
          errors++;
        }
      } else {
        const err34 = {
          instancePath: instancePath + '/model_spec_id',
          schemaPath: '#/properties/model_spec_id/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err34];
        } else {
          vErrors.push(err34);
        }
        errors++;
      }
    }
    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        const err35 = {
          instancePath: instancePath + '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err35];
        } else {
          vErrors.push(err35);
        }
        errors++;
      }
    }
    if (data.prediction_horizon_secs !== undefined) {
      let data11 = data.prediction_horizon_secs;
      if (
        !(
          typeof data11 == 'number' &&
          !(data11 % 1) &&
          !isNaN(data11) &&
          isFinite(data11)
        )
      ) {
        const err36 = {
          instancePath: instancePath + '/prediction_horizon_secs',
          schemaPath: '#/properties/prediction_horizon_secs/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err36];
        } else {
          vErrors.push(err36);
        }
        errors++;
      }
      if (typeof data11 == 'number' && isFinite(data11)) {
        if (data11 > 9007199254740991 || isNaN(data11)) {
          const err37 = {
            instancePath: instancePath + '/prediction_horizon_secs',
            schemaPath: '#/properties/prediction_horizon_secs/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 9007199254740991 },
            message: 'must be <= 9007199254740991',
          };
          if (vErrors === null) {
            vErrors = [err37];
          } else {
            vErrors.push(err37);
          }
          errors++;
        }
        if (data11 < -9007199254740991 || isNaN(data11)) {
          const err38 = {
            instancePath: instancePath + '/prediction_horizon_secs',
            schemaPath: '#/properties/prediction_horizon_secs/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: -9007199254740991 },
            message: 'must be >= -9007199254740991',
          };
          if (vErrors === null) {
            vErrors = [err38];
          } else {
            vErrors.push(err38);
          }
          errors++;
        }
      }
    }
    if (data.reason !== undefined) {
      if (typeof data.reason !== 'string') {
        const err39 = {
          instancePath: instancePath + '/reason',
          schemaPath: '#/properties/reason/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err39];
        } else {
          vErrors.push(err39);
        }
        errors++;
      }
    }
    if (data.thesis !== undefined) {
      let data13 = data.thesis;
      if (data13 && typeof data13 == 'object' && !Array.isArray(data13)) {
        if (data13.summary === undefined) {
          const err40 = {
            instancePath: instancePath + '/thesis',
            schemaPath: '#/$defs/ModelSpecThesis/required',
            keyword: 'required',
            params: { missingProperty: 'summary' },
            message: "must have required property '" + 'summary' + "'",
          };
          if (vErrors === null) {
            vErrors = [err40];
          } else {
            vErrors.push(err40);
          }
          errors++;
        }
        if (data13.hypothesis === undefined) {
          const err41 = {
            instancePath: instancePath + '/thesis',
            schemaPath: '#/$defs/ModelSpecThesis/required',
            keyword: 'required',
            params: { missingProperty: 'hypothesis' },
            message: "must have required property '" + 'hypothesis' + "'",
          };
          if (vErrors === null) {
            vErrors = [err41];
          } else {
            vErrors.push(err41);
          }
          errors++;
        }
        if (data13.limitations === undefined) {
          const err42 = {
            instancePath: instancePath + '/thesis',
            schemaPath: '#/$defs/ModelSpecThesis/required',
            keyword: 'required',
            params: { missingProperty: 'limitations' },
            message: "must have required property '" + 'limitations' + "'",
          };
          if (vErrors === null) {
            vErrors = [err42];
          } else {
            vErrors.push(err42);
          }
          errors++;
        }
        for (const key1 in data13) {
          if (
            !(
              key1 === 'hypothesis' ||
              key1 === 'limitations' ||
              key1 === 'summary'
            )
          ) {
            const err43 = {
              instancePath: instancePath + '/thesis',
              schemaPath: '#/$defs/ModelSpecThesis/additionalProperties',
              keyword: 'additionalProperties',
              params: { additionalProperty: key1 },
              message: 'must NOT have additional properties',
            };
            if (vErrors === null) {
              vErrors = [err43];
            } else {
              vErrors.push(err43);
            }
            errors++;
          }
        }
        if (data13.hypothesis !== undefined) {
          if (typeof data13.hypothesis !== 'string') {
            const err44 = {
              instancePath: instancePath + '/thesis/hypothesis',
              schemaPath: '#/$defs/ModelSpecThesis/properties/hypothesis/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            };
            if (vErrors === null) {
              vErrors = [err44];
            } else {
              vErrors.push(err44);
            }
            errors++;
          }
        }
        if (data13.limitations !== undefined) {
          let data15 = data13.limitations;
          if (Array.isArray(data15)) {
            const len0 = data15.length;
            for (let i0 = 0; i0 < len0; i0++) {
              if (typeof data15[i0] !== 'string') {
                const err45 = {
                  instancePath: instancePath + '/thesis/limitations/' + i0,
                  schemaPath:
                    '#/$defs/ModelSpecThesis/properties/limitations/items/type',
                  keyword: 'type',
                  params: { type: 'string' },
                  message: 'must be string',
                };
                if (vErrors === null) {
                  vErrors = [err45];
                } else {
                  vErrors.push(err45);
                }
                errors++;
              }
            }
          } else {
            const err46 = {
              instancePath: instancePath + '/thesis/limitations',
              schemaPath: '#/$defs/ModelSpecThesis/properties/limitations/type',
              keyword: 'type',
              params: { type: 'array' },
              message: 'must be array',
            };
            if (vErrors === null) {
              vErrors = [err46];
            } else {
              vErrors.push(err46);
            }
            errors++;
          }
        }
        if (data13.summary !== undefined) {
          if (typeof data13.summary !== 'string') {
            const err47 = {
              instancePath: instancePath + '/thesis/summary',
              schemaPath: '#/$defs/ModelSpecThesis/properties/summary/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            };
            if (vErrors === null) {
              vErrors = [err47];
            } else {
              vErrors.push(err47);
            }
            errors++;
          }
        }
      } else {
        const err48 = {
          instancePath: instancePath + '/thesis',
          schemaPath: '#/$defs/ModelSpecThesis/type',
          keyword: 'type',
          params: { type: 'object' },
          message: 'must be object',
        };
        if (vErrors === null) {
          vErrors = [err48];
        } else {
          vErrors.push(err48);
        }
        errors++;
      }
    }
    if (data.training_contract !== undefined) {
      if (
        !validate26(data.training_contract, {
          instancePath: instancePath + '/training_contract',
          parentData: data,
          parentDataProperty: 'training_contract',
          rootData,
          dynamicAnchors,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate26.errors
            : vErrors.concat(validate26.errors);
        errors = vErrors.length;
      }
    }
  } else {
    const err49 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err49];
    } else {
      vErrors.push(err49);
    }
    errors++;
  }
  validate42.errors = vErrors;
  return errors === 0;
}
validate42.evaluated = {
  props: true,
  dynamicProps: false,
  dynamicItems: false,
};
export const validateRunCpcv = validate45;
const schema53 = {
  description:
    "Inbound body for `POST /research/models/{id}/cpcv-backtest` (the model\nversion id is taken from the path).\n\n`Serialize` is derived so the request can be frozen into a durable\nresearch job's `params_json` and replayed on execute.\n\nModel family, input contract, supervised target, and prediction horizon are\ndeliberately absent: the server resolves them from the model version's\nlinked dataset and immutable model specification.",
  type: 'object',
  properties: {
    decision_policy_snapshot_id: {
      description:
        'Frozen runtime-config version governing `research.validation.*` (CPCV\npartitions, purge/embargo, trial grid, PBO block count, gate\nthresholds) + portfolio caps + provenance.',
      type: 'string',
      format: 'uuid',
    },
    path_set_id: {
      description:
        'Pre-assigned path-set id frozen at async enqueue for effectively-once\nrecovery; omit on direct calls — the job engine mints one before\npersisting params.',
      type: ['string', 'null'],
      format: 'uuid',
    },
    reason: {
      description: 'Operator reason recorded on the operation log.',
      type: 'string',
      maxLength: 512,
      minLength: 1,
    },
    training_dataset_id: {
      description:
        'Frozen, PIT-materialized dataset the model version was trained on.',
      type: 'string',
      format: 'uuid',
    },
  },
  additionalProperties: false,
  required: ['training_dataset_id', 'decision_policy_snapshot_id', 'reason'],
};
function validate45(
  data,
  {
    instancePath = '',
    parentData,
    parentDataProperty,
    rootData = data,
    dynamicAnchors = {},
  } = {},
) {
  let vErrors = null;
  let errors = 0;
  const evaluated0 = validate45.evaluated;
  if (evaluated0.dynamicProps) {
    evaluated0.props = undefined;
  }
  if (evaluated0.dynamicItems) {
    evaluated0.items = undefined;
  }
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.training_dataset_id === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'training_dataset_id' },
        message: "must have required property '" + 'training_dataset_id' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.decision_policy_snapshot_id === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'decision_policy_snapshot_id' },
        message:
          "must have required property '" + 'decision_policy_snapshot_id' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.reason === undefined) {
      const err2 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'reason' },
        message: "must have required property '" + 'reason' + "'",
      };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (
        !(
          key0 === 'decision_policy_snapshot_id' ||
          key0 === 'path_set_id' ||
          key0 === 'reason' ||
          key0 === 'training_dataset_id'
        )
      ) {
        const err3 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.decision_policy_snapshot_id !== undefined) {
      let data0 = data.decision_policy_snapshot_id;
      if (typeof data0 === 'string') {
        if (!formats0.test(data0)) {
          const err4 = {
            instancePath: instancePath + '/decision_policy_snapshot_id',
            schemaPath: '#/properties/decision_policy_snapshot_id/format',
            keyword: 'format',
            params: { format: 'uuid' },
            message: 'must match format "' + 'uuid' + '"',
          };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = {
          instancePath: instancePath + '/decision_policy_snapshot_id',
          schemaPath: '#/properties/decision_policy_snapshot_id/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.path_set_id !== undefined) {
      let data1 = data.path_set_id;
      if (typeof data1 !== 'string' && data1 !== null) {
        const err6 = {
          instancePath: instancePath + '/path_set_id',
          schemaPath: '#/properties/path_set_id/type',
          keyword: 'type',
          params: { type: schema53.properties.path_set_id.type },
          message: 'must be string,null',
        };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if (typeof data1 === 'string') {
        if (!formats0.test(data1)) {
          const err7 = {
            instancePath: instancePath + '/path_set_id',
            schemaPath: '#/properties/path_set_id/format',
            keyword: 'format',
            params: { format: 'uuid' },
            message: 'must match format "' + 'uuid' + '"',
          };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
      }
    }
    if (data.reason !== undefined) {
      let data2 = data.reason;
      if (typeof data2 === 'string') {
        if (func2(data2) > 512) {
          const err8 = {
            instancePath: instancePath + '/reason',
            schemaPath: '#/properties/reason/maxLength',
            keyword: 'maxLength',
            params: { limit: 512 },
            message: 'must NOT have more than 512 characters',
          };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        if (func2(data2) < 1) {
          const err9 = {
            instancePath: instancePath + '/reason',
            schemaPath: '#/properties/reason/minLength',
            keyword: 'minLength',
            params: { limit: 1 },
            message: 'must NOT have fewer than 1 characters',
          };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      } else {
        const err10 = {
          instancePath: instancePath + '/reason',
          schemaPath: '#/properties/reason/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.training_dataset_id !== undefined) {
      let data3 = data.training_dataset_id;
      if (typeof data3 === 'string') {
        if (!formats0.test(data3)) {
          const err11 = {
            instancePath: instancePath + '/training_dataset_id',
            schemaPath: '#/properties/training_dataset_id/format',
            keyword: 'format',
            params: { format: 'uuid' },
            message: 'must match format "' + 'uuid' + '"',
          };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
      } else {
        const err12 = {
          instancePath: instancePath + '/training_dataset_id',
          schemaPath: '#/properties/training_dataset_id/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
  } else {
    const err13 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate45.errors = vErrors;
  return errors === 0;
}
validate45.evaluated = {
  props: true,
  dynamicProps: false,
  dynamicItems: false,
};
