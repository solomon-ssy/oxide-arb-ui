const PALETTE_NAMES = [
  'amber',
  'blue',
  'cyan',
  'emerald',
  'fuchsia',
  'gray',
  'green',
  'grey',
  'indigo',
  'lime',
  'neutral',
  'orange',
  'pink',
  'purple',
  'red',
  'rose',
  'sky',
  'slate',
  'stone',
  'teal',
  'violet',
  'yellow',
  'zinc',
].join('|');

const COLOR_UTILITIES = [
  'accent',
  'bg',
  'border(?:-[trblxy])?',
  'caret',
  'decoration',
  'divide(?:-[xy])?',
  'fill',
  'from',
  'outline',
  'placeholder',
  'ring(?:-offset)?',
  'shadow',
  'stroke',
  'text',
  'to',
  'via',
].join('|');

const RAW_PALETTE_CLASS = new RegExp(
  String.raw`(?:^|:)(?:!)?(?:${COLOR_UTILITIES})-(?:${PALETTE_NAMES})-(?:50|100|200|300|400|500|600|700|800|900|950)(?:/(?:\d{1,3}|\[[^\]]+\]))?$`,
);
const RAW_COLOR_LITERAL =
  /#[0-9a-f]{3,8}\b|(?:rgb|rgba|hsl|hsla)\((?!\s*var\(--)/i;

function rawPaletteClasses(value) {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && RAW_PALETTE_CLASS.test(token));
}

function rawColorLiterals(value) {
  const trimmed = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
    return [trimmed];
  }
  const match = RAW_COLOR_LITERAL.exec(value);
  return match ? [match[0]] : [];
}

function literalValue(node) {
  if (typeof node.value === 'string') {
    return node.value;
  }
  if (typeof node.value?.raw === 'string') {
    return node.value.raw;
  }
  return undefined;
}

function createLiteralRule({ description, findViolations, messageId }) {
  return {
    meta: {
      docs: { description },
      messages: {
        [messageId]:
          messageId === 'rawPaletteClass'
            ? 'Use a semantic or visual design-token utility instead of raw palette class "{{token}}".'
            : 'Resolve renderer colors from a semantic or visual design token instead of raw color "{{token}}".',
      },
      schema: [],
      type: 'problem',
    },
    create(context) {
      const reported = new Set();

      function inspect(node) {
        const value = literalValue(node);
        if (value === undefined) return;

        for (const token of findViolations(value)) {
          const key = `${node.range?.[0] ?? node.loc?.start.line}:${messageId}:${token}`;
          if (reported.has(key)) continue;
          reported.add(key);
          context.report({ data: { token }, messageId, node });
        }
      }

      const visitors = {
        Literal: inspect,
        TemplateElement: inspect,
      };
      const templateVisitors = {
        Literal: inspect,
        TemplateElement: inspect,
        VLiteral: inspect,
      };
      const services = context.sourceCode.parserServices;
      return services?.defineTemplateBodyVisitor
        ? services.defineTemplateBodyVisitor(templateVisitors, visitors)
        : visitors;
    },
  };
}

const plugin = {
  meta: {
    name: 'eslint-plugin-quant-pivot-design-tokens',
    version: '1.0.0',
  },
  rules: {
    'no-raw-color-literals': createLiteralRule({
      description:
        'Require canvas and dynamically generated CSS colors to resolve design tokens.',
      findViolations: rawColorLiterals,
      messageId: 'rawColorLiteral',
    }),
    'no-raw-palette-classes': createLiteralRule({
      description:
        'Require Tailwind color utilities to use semantic or visual design tokens.',
      findViolations: rawPaletteClasses,
      messageId: 'rawPaletteClass',
    }),
  },
};

export default plugin;
export { rawColorLiterals, rawPaletteClasses };
