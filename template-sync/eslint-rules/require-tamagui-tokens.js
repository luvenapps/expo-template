const TOKEN_STYLE_PROPERTIES = new Set([
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRadius',
  'borderRightWidth',
  'borderTopWidth',
  'borderWidth',
  'bottom',
  'columnGap',
  'color',
  'backgroundColor',
  'borderColor',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'gap',
  'height',
  'left',
  'letterSpacing',
  'lineHeight',
  'margin',
  'marginBottom',
  'marginHorizontal',
  'marginLeft',
  'marginRight',
  'marginTop',
  'marginVertical',
  'maxHeight',
  'maxWidth',
  'minHeight',
  'minWidth',
  'padding',
  'paddingBottom',
  'paddingHorizontal',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingVertical',
  'right',
  'rowGap',
  'shadowRadius',
  'outlineColor',
  'fill',
  'stroke',
  'top',
  'width',
  'zIndex',
]);

const OLD_TOKEN_PREFIX = /(?:^|[\s:])\$[a-z0-9]+/i;
const PIXEL_VALUE = /^-?\d+(?:\.\d+)?px$/i;
const HARD_CODED_COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\()/i;
const COLOR_STYLE_PROPERTIES = new Set([
  'backgroundColor',
  'borderColor',
  'color',
  'fill',
  'outlineColor',
  'stroke',
]);
const SVG_ELEMENT_NAMES = new Set([
  'Circle',
  'Ellipse',
  'G',
  'Line',
  'Path',
  'Polygon',
  'Polyline',
  'Rect',
  'Svg',
]);

function getJsxName(node) {
  if (node?.type === 'JSXIdentifier') return node.name;
  if (node?.type === 'JSXMemberExpression') return getJsxName(node.property);
  return undefined;
}

function getStaticString(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw;
  }
  return undefined;
}

function isNumericLiteral(node) {
  return node?.type === 'Literal' && typeof node.value === 'number';
}

function getExpression(node) {
  return node?.type === 'JSXExpressionContainer' ? node.expression : node;
}

function getStyleObjectExpressions(node) {
  const expression = getExpression(node);
  if (expression?.type === 'ObjectExpression') return [expression];
  if (expression?.type === 'ArrayExpression') {
    return expression.elements.flatMap((element) => getStyleObjectExpressions(element));
  }
  return [];
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require Tamagui tokens for fixed styling values in app UI.',
    },
    schema: [],
    messages: {
      oldToken: 'Use unprefixed Tamagui v3 tokens instead of the v1 $ token prefix.',
      pixelString: 'Use a shared Tamagui token instead of an inline pixel string.',
      colorLiteral: 'Use a theme or semantic color token instead of an inline color literal.',
      numericStyle: 'Use a shared Tamagui token instead of a fixed numeric style value.',
    },
  },
  create(context) {
    function reportValue(
      node,
      propertyName,
      { numericStyle = true, checkLegacyToken = true, checkColorLiteral = true } = {},
    ) {
      const stringValue = getStaticString(node);
      if (checkLegacyToken && stringValue && OLD_TOKEN_PREFIX.test(stringValue)) {
        context.report({ node, messageId: 'oldToken' });
        return;
      }

      if (
        stringValue &&
        TOKEN_STYLE_PROPERTIES.has(propertyName) &&
        PIXEL_VALUE.test(stringValue)
      ) {
        context.report({ node, messageId: 'pixelString' });
        return;
      }

      if (
        checkColorLiteral &&
        stringValue &&
        COLOR_STYLE_PROPERTIES.has(propertyName) &&
        HARD_CODED_COLOR.test(stringValue)
      ) {
        context.report({ node, messageId: 'colorLiteral' });
        return;
      }

      if (numericStyle && TOKEN_STYLE_PROPERTIES.has(propertyName) && isNumericLiteral(node)) {
        context.report({ node, messageId: 'numericStyle' });
      }
    }

    function inspectStyleObject(styleObject) {
      for (const property of styleObject.properties) {
        if (property.type !== 'Property' || property.computed) continue;
        const propertyName =
          property.key.type === 'Identifier' || property.key.type === 'Literal'
            ? String(property.key.name ?? property.key.value)
            : undefined;
        if (!propertyName) continue;
        reportValue(property.value, propertyName);
      }
    }

    return {
      JSXAttribute(node) {
        const propertyName = getJsxName(node.name);
        if (!propertyName) return;

        const value = getExpression(node.value);
        if (propertyName === 'style') {
          getStyleObjectExpressions(node.value).forEach(inspectStyleObject);
          return;
        }

        const openingElement = node.parent;
        const isSvgElement = SVG_ELEMENT_NAMES.has(getJsxName(openingElement.name));
        const isSvgGeometry =
          isSvgElement && (propertyName === 'width' || propertyName === 'height');
        reportValue(value, propertyName, {
          numericStyle: !isSvgGeometry,
          checkLegacyToken:
            TOKEN_STYLE_PROPERTIES.has(propertyName) || propertyName === 'boxShadow',
          checkColorLiteral: !isSvgElement,
        });
      },
    };
  },
};
