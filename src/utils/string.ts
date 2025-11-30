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

/**
 * Converts a plural word to its singular form
 *
 * Handles common English pluralization rules but not all irregular plurals.
 *
 * @param word - The plural word to convert
 * @returns The singular version of the word
 *
 * @example
 * singularize('wives') // 'wife'
 * singularize('strategies') // 'strategy'
 * singularize('boxes') // 'box'
 * singularize('papers') // 'paper'
 */
export function singularize(word: string): string {
  const endings: Record<string, string> = {
    ves: 'fe', // wives -> wife
    ies: 'y', // strategies -> strategy
    i: 'us', // cacti -> cactus (irregular)
    zes: 'ze', // dozes -> doze
    ses: 's', // classes -> class
    es: '', // boxes -> box
    s: '', // papers -> paper
  };

  // Iterate through the endings in reverse order of length to prioritize longer matches
  for (const ending in endings) {
    if (word.endsWith(ending)) {
      return word.slice(0, -ending.length) + endings[ending];
    }
  }

  // If no specific rule applies, assume it's already singular or an irregular plural not covered
  return word;
}

/**
 * Converts a singular word to its plural form
 *
 * Handles common English pluralization rules but not all irregular plurals.
 *
 * @param word - The singular word to convert
 * @returns The plural version of the word
 *
 * @example
 * pluralize('wife') // 'wives'
 * pluralize('strategy') // 'strategies'
 * pluralize('box') // 'boxes'
 * pluralize('paper') // 'papers'
 */
export function pluralize(word: string): string {
  // Handle consonant + 'y' -> 'ies' (special case needs character check)
  if (word.endsWith('y') && word.length > 1) {
    const beforeY = word[word.length - 2];
    if (beforeY && !'aeiou'.includes(beforeY.toLowerCase())) {
      return word.slice(0, -1) + 'ies';
    }
  }

  // Replacements: endings to remove and what to replace them with
  const replacements: Record<string, string> = {
    fe: 'ves', // safe -> saves
    us: 'i', // cactus -> cacti
  };

  // Check replacements (longer endings first due to object key order)
  for (const ending in replacements) {
    if (word.endsWith(ending)) {
      return word.slice(0, -ending.length) + replacements[ending];
    }
  }

  // Additions: endings that just need a suffix added (no removal)
  const additions: Record<string, string> = {
    ch: 'es', // watch -> watches
    sh: 'es', // wish -> wishes
    z: 'zes', // quiz -> quizzes
    s: 'es', // class -> classes
    x: 'es', // box -> boxes
  };

  for (const ending in additions) {
    if (word.endsWith(ending)) {
      return word + additions[ending];
    }
  }

  // Default: just add 's'
  return word + 's';
}
