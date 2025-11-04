/**
 * String utility functions
 */

/**
 * Converts a camelCase or PascalCase string to snake_case
 *
 * @param str - The string to convert
 * @returns The snake_case version of the string
 *
 * @example
 * toSnakeCase('entityId') // 'entity_id'
 * toSnakeCase('isEnabled') // 'is_enabled'
 * toSnakeCase('userId') // 'user_id'
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
