module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Route user-visible errors through useFriendlyErrorHandler and avoid raw error toasts',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        // Flag raw setError('message') in app/src code
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'setError' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal'
        ) {
          context.report({
            node,
            message:
              'Use useFriendlyErrorHandler to derive user-facing error copy instead of hardcoded strings.',
          });
        }

        // Flag error toasts built directly
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'show' &&
          node.arguments[0]?.type === 'ObjectExpression'
        ) {
          const hasErrorType = node.arguments[0].properties.some(
            (prop) =>
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'type' &&
              prop.value.type === 'Literal' &&
              prop.value.value === 'error',
          );

          if (hasErrorType) {
            context.report({
              node,
              message:
                'Use useFriendlyErrorHandler for error toasts so copy and analytics stay consistent.',
            });
          }
        }
      },
    };
  },
};
