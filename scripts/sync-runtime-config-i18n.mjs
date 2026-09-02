import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.resolve(root, '../schema/api/config-v1.schema.json');
const localePaths = {
  'en-US': path.resolve(
    root,
    'apps/web-antdv-next/src/locales/langs/en-US/page.json',
  ),
  'zh-CN': path.resolve(
    root,
    'apps/web-antdv-next/src/locales/langs/zh-CN/page.json',
  ),
};
const resources = {
  execution_authorization_policy: 'ExecutionAuthorizationPolicy',
  execution_risk_policy: 'ExecutionRiskPolicy',
  model_routing: 'ModelRouting',
  operations_policy: 'OperationsPolicy',
  recommendation_policy: 'RecommendationPolicy',
  report_schedule: 'ReportSchedule',
};

const zhLabels = {
  bound_at: '绑定时间',
  candidate_batch_size: '候选批次上限',
  capital_time_buckets: '资本占用时间桶',
  cash_reserve_usd: '现金保留额（USD）',
  config_revision: '配置 Revision',
  cvar_confidence_bps: 'CVaR 置信水平（基点）',
  generation: 'Route Generation',
  liquidity_buffer_bps: '流动性缓冲（基点）',
  max_execution_age_secs: '最终确认成交最大延迟（秒）',
  max_cvar_usd: 'CVaR 损失上限（USD）',
  max_drawdown_usd: '最大回撤上限（USD）',
  max_open_capital_usd: '最大开放资本（USD）',
  max_open_recommendations: '最大开放推荐数',
  max_probability_interval_width_bps: '概率区间最大宽度（基点）',
  max_route_exposure_usd: '单 Route 敞口上限（USD）',
  max_scenario_loss_usd: '最大场景损失（USD）',
  min_nominal_expected_net_usd: '最低名义预期净收益（USD）',
  min_profit_probability_bps: '最低盈利概率下界（基点）',
  min_robust_expected_net_usd: '最低稳健预期净收益（USD）',
  model_version_id: '模型版本 ID',
  portfolio_scenario_model_bindings: '组合场景模型绑定',
  shadow: 'Shadow 模型绑定',
  source: '绑定来源',
  source_block_span: '来源区块扫描跨度',
};

const zhDescriptions = {
  bound_at:
    '记录该模型或联合场景绑定完成的 UTC 时间，用于冻结报告决策快照和追溯激活顺序。',
  candidate_batch_size:
    '限制每轮结果对账在单个处理通道中扫描的 Recommendation 或 OrderIntent 数量，防止无界延迟和内存占用。',
  capital_time_buckets:
    '定义严格递增的资本锁定时间桶及各桶 USD 上限；每个可执行 sizing tier 都必须在某个时间桶内结束，否则报告 fail closed。',
  cash_reserve_usd:
    '每个联合场景下都必须保持可立即使用的 USD 现金储备，不得被新推荐或既有持仓占用。',
  config_revision:
    '引用生成该绑定的治理配置 revision，用于防止模型与决策政策跨代混用。',
  cvar_confidence_bps:
    '以基点表示 CVaR 尾部置信水平，必须严格位于 0 与 10,000 之间；数值越高，约束越聚焦极端损失尾部。',
  generation:
    '该 Route 服务绑定的单调 generation，报告运行期间会被冻结，防止中途激活造成模型污染。',
  liquidity_buffer_bps:
    '在准入时额外扣除的流动性安全缓冲，用于覆盖报价陈旧、深度衰减与成交不确定性。',
  max_execution_age_secs:
    '最终确认成交在决策时允许的最大年龄（秒）；超过该边界时依赖成交历史的特征必须 fail closed。',
  max_cvar_usd:
    '全局组合在指定置信水平下可接受的最大 CVaR 尾部损失（USD），作为 MILP 硬约束而非目标权重。',
  max_drawdown_usd:
    '在决策边界准入的最大策略回撤（USD）；超限时整份报告不得发布。',
  max_open_capital_usd:
    '所有开放持仓、OrderIntent 与新选 tier 合计可锁定的最大本金（USD）。',
  max_open_recommendations:
    '允许同时处于开放状态的 Recommendation 数量上限，包含已有推荐和本次全局组合新选项。',
  max_probability_interval_width_bps:
    '允许的校准概率不确定性区间最大宽度（基点）；区间更宽的候选在优化前即被拒绝。',
  max_route_exposure_usd:
    '单个模型 Route 在既有持仓与新选 tier 合并后的最大 USD 风险暴露。',
  max_scenario_loss_usd:
    '在任一已促进的联合场景或显式压力场景中允许的最大损失（USD）。',
  min_nominal_expected_net_usd:
    '候选进入全局优化前必须达到的最低名义预期净收益（USD），已扣除费用、滑点和资本成本。',
  min_profit_probability_bps:
    '候选准入所需的最低保守盈利概率下界（基点），不与 USD 目标做无量纲加权。',
  min_robust_expected_net_usd:
    '候选进入全局优化前必须达到的最低稳健预期净收益（USD），按允许的最不利分布评估。',
  model_version_id:
    '精确绑定到不可变模型版本 UUID；报告决策快照内不得跨版本 fallback。',
  portfolio_scenario_model_bindings:
    '按有序 represented Route 集合绑定唯一的联合场景模型 artifact；Route set、serving、calibration、trade policy 或时间桶 digest 不匹配时整份报告 fail closed。',
  shadow:
    '该 Route 的 Shadow 模型绑定，仅生成可审计对比证据，不参与实时决策或执行。',
  source:
    '不可变的模型绑定来源，明确区分初始治理与 feedback cycle 促进，便于完整追溯。',
  source_block_span:
    '每次结果解析允许扫描的最大已最终确认源区块数，用于限制单轮工作量。',
};

const enDescriptions = {
  bound_at:
    'UTC activation time frozen into the binding lineage and report decision snapshot.',
  config_revision:
    'Governed policy-bundle generation that created this immutable model binding.',
  generation:
    'Monotonic Route serving generation frozen for the complete report run.',
  liquidity_buffer_bps:
    'Additional liquidity haircut, in basis points, applied before a candidate may enter global optimization.',
  max_probability_interval_width_bps:
    'Maximum calibrated probability-interval width, in basis points, admitted before optimization.',
  min_profit_probability_bps:
    'Minimum conservative profit-probability lower bound, in basis points; it is an admission constraint, never an objective weight.',
  model_version_id:
    'Exact immutable model-version UUID; no cross-version fallback is allowed.',
  operator_approval_ttl_secs:
    'Maximum lifetime, in seconds, of an operator approval before admission must be repeated against fresh account, market, and policy evidence.',
  schedules:
    'Complete governed report schedule list. Each item freezes cadence, timezone, TopN, knowledge lag, and enabled state.',
  shadow:
    'Optional Route-local challenger binding used only for audited shadow comparison; it never serves report decisions.',
};

const zhScopedDescriptions = {
  'execution_authorization_policy:/operator_approval_ttl_secs':
    '操作员批准的有效期（秒）；过期后必须基于最新账户、市场与政策快照重新准入。',
  'execution_authorization_policy:/policy_automatic_limits/max_orders_per_report':
    '每份已发布报告最多允许策略自动授权的订单数；超出部分只能进入操作员批准路径。',
  'execution_authorization_policy:/policy_automatic_limits/max_total_usd_per_report':
    '每份报告可由策略自动授权的累计 USD 名义金额硬上限；按全局排名顺序累加已授权 tier。',
  'execution_risk_policy:/breaker/cooldown_secs':
    'Venue 在无新失败的情况下从 Degraded 自恢复为 Healthy 所需的连续时间（秒）。',
  'execution_risk_policy:/breaker/daily_realized_loss_cap_usd':
    '按 UTC 自然日计算的已实现亏损硬上限（USD）；达到 80% 时降级 venue health，达到上限时锁定 kill-switch。必须严格大于零。',
  'execution_risk_policy:/breaker/venue_consecutive_failures_to_degrade':
    '将 venue breaker 从 Healthy 降级为 Degraded 所需的连续失败次数；Degraded 会延后新执行准入。',
  'execution_risk_policy:/breaker/venue_consecutive_failures_to_halt':
    '将 venue breaker 切换为 Halted 并锁定 kill-switch 所需的连续失败次数，不得小于降级阈值。',
  'execution_risk_policy:/breaker/venue_error_rate_bps_to_halt':
    '滚动观测窗口内会触发 Halted 的 venue 错误率（基点），必须位于 1–10,000。',
  'execution_risk_policy:/breaker/venue_min_window_samples':
    '启用错误率门禁前滚动窗口必须具备的最小样本数，用于避免小样本误触发。',
  'execution_risk_policy:/breaker/venue_window_secs':
    '统计 venue 错误率与连续失败状态的滚动观测窗口长度（秒）。',
  'execution_risk_policy:/entry_order_policy/max_slippage_bps':
    '入场订单允许相对报告冻结价格产生的最大滑点（基点），报告建模和下单前均必须复核。',
  'execution_risk_policy:/entry_order_policy/min_entry_book_depth_usd':
    '入场限价内必须真实可成交的最小可见卖盘深度（USD）；冻结到 EntryPlan 并在执行准入再次校验，必须严格大于零。',
  'execution_risk_policy:/exit_monitor/enabled':
    '控制退出监控 worker 是否主动评估所有开放 lot；关闭会停止价格、时间、trailing 与模型退出检查。',
  'execution_risk_policy:/exit_monitor/monitor_secs':
    '退出监控扫描价格止损、时间止损、trailing 与分批退出的基础周期（秒）。',
  'execution_risk_policy:/exit_monitor/opportunistic_sell/enabled':
    '是否在持仓论点仍有效时启用机会型 Sell 评估；启用前必须可执行模型再推理。',
  'execution_risk_policy:/exit_monitor/opportunistic_sell/shadow_mode':
    '开启时仍运行并审计机会型 Sell 打分，但不提交该类退出；强制止损和时间退出不受影响。',
  'execution_risk_policy:/exit_monitor/signal_recheck_secs':
    '同一 lot 两次模型信号再推理之间的最小间隔（秒），与更高频的价格监控周期独立。',
  'execution_risk_policy:/exit_monitor/signal_reinference/enabled':
    '是否为开放 lot 启用模型支持的论点再推理，以检测信号失效。',
  'execution_risk_policy:/exit_monitor/signal_reinference/shadow_mode':
    '开启时仍生成完整再推理审计证据，但抑制“论点失效”退出；强制止损、时间与 trailing 退出继续生效。',
  'execution_risk_policy:/maker_rebate/fallback_lag_from_program_close_secs':
    'Maker rebate 计划日结束后，在 venue 尚未发布实际奖励时继续使用保守估值的最长等待时间（秒）；超时后该激励必须按不可用处理。',
  'execution_risk_policy:/maker_rebate/observed_p95_min_samples':
    '采用历史观测 P95 到账延迟前所需的最小成功样本数；样本不足时必须使用冻结的保守延迟。',
  'execution_risk_policy:/maker_rebate/payout_threshold_usd':
    '只有累计预期 Maker rebate 达到该 USD 阈值后，才允许把预期激励纳入可支付性与经济结果核算。',
  'execution_risk_policy:/portfolio/budget/total_budget_usd':
    '策略允许治理的账户总资本上限（USD）；实际可用金额仍以冻结的真实 AccountSnapshot 为准。',
  'execution_risk_policy:/portfolio/exposure_limits/max_category_exposure_usd':
    '同一 category 下既有持仓与新选 tier 合计的最大 USD 暴露；category 仅是风险桶，不是报告分区。',
  'execution_risk_policy:/portfolio/exposure_limits/max_event_exposure_usd':
    '同一底层 event 下所有 market/outcome 在结构互斥与既有持仓合并后的最大 USD 暴露。',
  'execution_risk_policy:/portfolio/exposure_limits/max_market_exposure_usd':
    '单个 market 下所有 outcome/side 在既有持仓与新选 tier 合并后的最大 USD 暴露。',
  'execution_risk_policy:/portfolio/exposure_limits/max_single_recommendation_usd':
    '单条 Recommendation 允许分配的最大 USD 本金，在真实 L2 walk 产生的离散 sizing tier 上强制执行。',
  'execution_risk_policy:/reconciliation/enabled':
    '是否启用订单与 venue 状态对账；任何可执行入场权限启用时必须保持开启。',
  'execution_risk_policy:/reconciliation/interval_secs':
    '执行对账 worker 轮询未终态订单与资本保留状态的周期（秒）。',
  'execution_risk_policy:/reconciliation/stale_open_secs':
    '订单持续未对账的最长时间（秒）；超时挂单会主动撤销，venue 不可读时升级为 Unresolvable。',
  'model_routing:/model/active_exit_model_version_id':
    '当前生效的 Sell-side hold-vs-exit 模型版本，与 Buy Route 绑定独立治理，不得相互 fallback。',
  'model_routing:/model/calibration/ci_confidence':
    '可靠性分箱 Wilson 区间的双侧置信水平，必须严格位于 0.5 和 1 之间。',
  'model_routing:/model/calibration/embargo_secs':
    '模型训练数据窗口与校准数据窗口之间的最小 embargo（秒），必须大于零以防止时间泄漏。',
  'model_routing:/model/calibration/method':
    '默认概率校准器拟合方法；isotonic 仅在样本量达标时允许，否则必须使用 Platt。',
  'model_routing:/model/calibration/min_samples_isotonic':
    '允许拟合 isotonic calibration 所需的最小 PIT 样本数；低于该阈值时必须 fail closed 到 Platt 方法选择，不得静默拟合。',
  'model_routing:/model/shadow_diff_threshold':
    '同一 Route 的 Shadow 与 Champion 预测差异审计阈值；超限会生成硬分歧证据，不会自动切换模型。',
  'operations_policy:/entry_condition/backstop_interval_ms':
    '入场条件 worker 的安全兜底扫描周期（毫秒）；实时 source/book/clock 通知仍是主唤醒路径。',
  'operations_policy:/entry_condition/expiry_batch_limit':
    '单次过期清扫最多转移为终态的条件实例数，为工作量和事务延迟提供硬边界。',
  'operations_policy:/entry_condition/lease_duration_secs':
    '单个 worker 独占处理条件实例的 lease 时长（秒），过期后才允许其他 worker 显式接管。',
  'operations_policy:/entry_condition/lease_renew_interval_secs':
    '已持有 lease 的续租周期（秒），必须严格小于 lease 时长，以保证接管可审计。',
  'operations_policy:/entry_condition/next_evaluation_delay_ms':
    '一次评估后仍活跃的条件实例再次进入调度队列前的最小延迟（毫秒）。',
  'operations_policy:/entry_condition/pass_limit':
    '单个 worker pass 最多评估的到期条件实例数，用于限制 CPU、DB 事务与尾延迟。',
  'operations_policy:/kill_switch/emergency_exit/kind':
    'Kill-switch 升级后的紧急退出方式；manual_only 仅通知操作员，liquidate_all 才允许在滑点上限内自动减仓。',
  'operations_policy:/kill_switch/emergency_exit/max_slippage_bps':
    '自动紧急清算允许的最大滑点（基点）；即使已触发 kill-switch，也不允许无价格保护下单。',
  'operations_policy:/notifications/report_published':
    '是否在完整 RecommendationReport 事务发布成功后通知操作员；失败 run 和部分结果不得伪装为发布通知。',
  'operations_policy:/outcome_reconciliation/economic_source_lateness_secs':
    'RecommendationEconomicOutcome 在冻结 horizon 后允许等待 L2、费用与被动成交事实补齐的最长时间（秒）；超时后必须以明确 censored/insufficient 状态收口。',
  'operations_policy:/outcome_reconciliation/enabled':
    '是否启用已解析市场结果对账，这是 15-stage feedback closure 生成成熟标签的必要条件。',
  'operations_policy:/outcome_reconciliation/sweep_secs':
    '市场结果对账轮次之间的间隔（秒），必须大于零以防止空转或停摆。',
  'report_schedule:/schedules':
    '完整的受治理报告调度列表；每项明确 cadence/timezone、TopN、PIT knowledge lag 和启用状态，已启用调度必须共享一致 knowledge lag。',
};

const zhGroups = {
  breaker: '执行熔断',
  capital: '执行资本准入',
  data_quality: '数据质量',
  entry_condition: '入场条件 Worker',
  entry_order_policy: '入场订单策略',
  exit_monitor: '退出监控',
  kill_switch: 'Kill Switch',
  'model/buy_routes': '模型 / Buy Route 绑定',
  'model/calibration': '模型 / 概率校准',
  'model/active_exit_model_version_id': '模型 / 退出模型',
  'model/portfolio_scenario_model_bindings': '模型 / 联合场景绑定',
  'model/shadow_diff_threshold': '模型 / Shadow 阈值',
  notifications: '通知策略',
  outcome_reconciliation: '结果对账',
  'portfolio/admission': '组合 / 候选准入',
  'portfolio/budget': '组合 / 资金预算',
  'portfolio/exposure_limits': '组合 / 敞口上限',
  'portfolio/tail_risk': '组合 / 尾部风险',
  reconciliation: '执行对账',
  reports: '报告策略',
  schedules: '报告调度',
  selection: '市场筛选',
};

const check = process.argv.includes('--check');
const schema = readJson(schemaPath);
const locales = Object.fromEntries(
  Object.entries(localePaths).map(([locale, localePath]) => [
    locale,
    readJson(localePath),
  ]),
);
const inventory = descriptorInventory(schema);

if (check) {
  const failures = [];
  for (const [locale, document] of Object.entries(locales)) {
    const actual = flattenRuntimeFields(document.config?.runtimeField);
    const expected = inventory.map(({ pointer, resource }) =>
      fieldKey(resource, pointer),
    );
    for (const key of expected) {
      const value = actual.get(key);
      if (!value?.label?.trim() || !value.description?.trim()) {
        failures.push(`${locale}: missing complete runtime translation ${key}`);
      }
      if (isGenericDescription(value?.description, locale)) {
        failures.push(`${locale}: generic runtime description ${key}`);
      }
    }
    for (const key of actual.keys()) {
      if (!expected.includes(key)) {
        failures.push(`${locale}: stale runtime translation ${key}`);
      }
    }
    if (document.config?.policyField !== undefined) {
      failures.push(
        `${locale}: leaf-only policyField translations are forbidden`,
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }
  console.log(
    `runtime config i18n audit passed (${inventory.length} pointers)`,
  );
  process.exit(0);
}

for (const [locale, document] of Object.entries(locales)) {
  if (document.config?.policyField !== undefined) {
    throw new Error(
      `${locale}: leaf-only policyField translations are forbidden`,
    );
  }
  const existing = flattenRuntimeFields(document.config?.runtimeField);
  const next = {};
  for (const item of inventory) {
    const key = fieldKey(item.resource, item.pointer);
    const current = existing.get(key);
    const leaf = item.pointer.split('/').at(-1);
    const englishTitle = schemaTitle(item.schema, leaf);
    const label =
      current?.label ??
      (locale === 'zh-CN' ? (zhLabels[leaf] ?? englishTitle) : englishTitle);
    const generatedDescription =
      locale === 'zh-CN'
        ? (zhScopedDescriptions[key] ??
          zhDescriptions[leaf] ??
          `配置“${label}”。提交前必须复核字段单位、约束、风险等级与精确生效边界。`)
        : (enDescriptions[leaf] ?? schemaDescription(item.schema, label));
    const description = isGenericDescription(current?.description, locale)
      ? generatedDescription
      : (current?.description ?? generatedDescription);
    setRuntimeField(next, item.resource, item.pointer, {
      description,
      label,
    });
  }
  document.config.runtimeField = next;
  document.config.runtimeGroup = groupTranslations(inventory, locale);
  fs.writeFileSync(
    localePaths[locale],
    `${JSON.stringify(document, null, 2)}\n`,
  );
}
console.log(`synchronized runtime config i18n (${inventory.length} pointers)`);

function descriptorInventory(rootSchema) {
  return Object.entries(resources).flatMap(([resource, typeName]) =>
    collectLeaves(rootSchema, rootSchema.$defs[typeName]).map((item) => ({
      ...item,
      resource,
    })),
  );
}

function collectLeaves(rootSchema, node, pointer = '', seen = new Set()) {
  const resolved = resolveNode(rootSchema, node, seen);
  if (resolved['x-ui-visible'] === false) return [];
  const properties = resolved.properties;
  if (properties && Object.keys(properties).length > 0) {
    return Object.entries(properties).flatMap(([name, child]) =>
      collectLeaves(
        rootSchema,
        child,
        `${pointer}/${name.replaceAll('~', '~0').replaceAll('/', '~1')}`,
        seen,
      ),
    );
  }
  return pointer === '' ? [] : [{ pointer, schema: resolved }];
}

function resolveNode(rootSchema, node, seen) {
  if (!node.$ref) return node;
  if (seen.has(node.$ref)) return node;
  const nextSeen = new Set(seen).add(node.$ref);
  let target = rootSchema;
  for (const segment of node.$ref.slice(2).split('/')) {
    target = target[segment];
  }
  const resolved = resolveNode(rootSchema, target, nextSeen);
  const annotations = Object.fromEntries(
    Object.entries(node).filter(([key]) => key !== '$ref'),
  );
  return { ...resolved, ...annotations };
}

function schemaTitle(fieldSchema, fallback) {
  const title = fieldSchema.title;
  return typeof title === 'string' && title.trim() !== ''
    ? title
    : humanize(fallback);
}

function schemaDescription(fieldSchema, label) {
  const description = fieldSchema.description;
  return typeof description === 'string' && description.trim() !== ''
    ? description.replaceAll(/\s+/g, ' ').trim()
    : `Configure ${label} and review its unit, constraints, risk level, and exact apply boundary before submission.`;
}

function humanize(value) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function fieldKey(resource, pointer) {
  return `${resource}:${pointer}`;
}

function setRuntimeField(target, resource, pointer, value) {
  const segments = [resource, ...pointer.split('/').filter(Boolean)];
  const leaf = segments.pop();
  let current = target;
  for (const segment of segments) {
    current[segment] ??= {};
    current = current[segment];
  }
  current[leaf] = value;
}

function flattenRuntimeFields(runtimeField) {
  const fields = new Map();
  for (const resource of Object.keys(resources)) {
    walkRuntimeFields(runtimeField?.[resource], resource, [], fields);
  }
  return fields;
}

function walkRuntimeFields(node, resource, pathSegments, target) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.label === 'string' || typeof node.description === 'string') {
    target.set(fieldKey(resource, `/${pathSegments.join('/')}`), node);
    return;
  }
  for (const [segment, child] of Object.entries(node)) {
    walkRuntimeFields(child, resource, [...pathSegments, segment], target);
  }
}

function groupTranslations(items, locale) {
  const result = {};
  for (const { pointer, resource } of items) {
    const segments = pointer.split('/').filter(Boolean).slice(0, 2);
    const group = ['model', 'portfolio'].includes(segments[0])
      ? segments.join('/')
      : segments[0];
    const label =
      locale === 'zh-CN'
        ? (zhGroups[group] ?? humanizeGroup(group))
        : humanizeGroup(group);
    setRuntimeGroup(result, resource, group, label);
  }
  return result;
}

function humanizeGroup(group) {
  return group
    .split('/')
    .map((segment) => humanize(segment))
    .join(' / ');
}

function setRuntimeGroup(target, resource, group, value) {
  const segments = [resource, ...group.split('/')];
  const leaf = segments.pop();
  let current = target;
  for (const segment of segments) {
    current[segment] ??= {};
    current = current[segment];
  }
  current[leaf] = value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isGenericDescription(description, locale) {
  if (typeof description !== 'string') return false;
  return locale === 'zh-CN'
    ? description.startsWith('配置“') && description.includes('字段单位')
    : description.startsWith('Configure ') &&
        description.includes('exact apply boundary');
}
