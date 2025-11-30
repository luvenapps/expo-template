import { pluralize, singularize, toSnakeCase } from '@/utils/string';

describe('toSnakeCase', () => {
  it('converts camelCase to snake_case', () => {
    expect(toSnakeCase('entityId')).toBe('entity_id');
    expect(toSnakeCase('userId')).toBe('user_id');
    expect(toSnakeCase('isEnabled')).toBe('is_enabled');
    expect(toSnakeCase('createdAt')).toBe('created_at');
    expect(toSnakeCase('updatedAt')).toBe('updated_at');
  });

  it('converts PascalCase to snake_case', () => {
    expect(toSnakeCase('EntityId')).toBe('_entity_id');
    expect(toSnakeCase('UserId')).toBe('_user_id');
  });

  it('handles strings with multiple capitals', () => {
    expect(toSnakeCase('entityIdColumn')).toBe('entity_id_column');
    expect(toSnakeCase('userIdAndName')).toBe('user_id_and_name');
  });

  it('handles strings with consecutive capitals', () => {
    expect(toSnakeCase('XMLParser')).toBe('_x_m_l_parser');
    expect(toSnakeCase('HTTPRequest')).toBe('_h_t_t_p_request');
  });

  it('handles strings that are already lowercase', () => {
    expect(toSnakeCase('entity')).toBe('entity');
    expect(toSnakeCase('user')).toBe('user');
    expect(toSnakeCase('lowercase')).toBe('lowercase');
  });

  it('handles empty strings', () => {
    expect(toSnakeCase('')).toBe('');
  });

  it('handles single character strings', () => {
    expect(toSnakeCase('a')).toBe('a');
    expect(toSnakeCase('A')).toBe('_a');
  });

  it('handles numbers in the string', () => {
    expect(toSnakeCase('entity123')).toBe('entity123');
    expect(toSnakeCase('entity123Id')).toBe('entity123_id');
  });
});

describe('singularize', () => {
  it('converts words ending in "ves" to "fe"', () => {
    expect(singularize('wives')).toBe('wife');
    expect(singularize('knives')).toBe('knife');
    expect(singularize('lives')).toBe('life');
  });

  it('converts words ending in "ies" to "y"', () => {
    expect(singularize('strategies')).toBe('strategy');
    expect(singularize('entries')).toBe('entry');
    expect(singularize('categories')).toBe('category');
  });

  it('converts words ending in "i" to "us"', () => {
    expect(singularize('cacti')).toBe('cactus');
    expect(singularize('fungi')).toBe('fungus');
  });

  it('converts words ending in "zes" to "ze"', () => {
    expect(singularize('dozes')).toBe('doze');
  });

  it('converts words ending in "ses" to "s"', () => {
    expect(singularize('classes')).toBe('class');
    expect(singularize('passes')).toBe('pass');
  });

  it('converts words ending in "es" by removing "es"', () => {
    expect(singularize('boxes')).toBe('box');
    expect(singularize('wishes')).toBe('wish');
  });

  it('converts words ending in "s" by removing "s"', () => {
    expect(singularize('papers')).toBe('paper');
    expect(singularize('habits')).toBe('habit');
    expect(singularize('reminders')).toBe('reminder');
  });

  it('returns the word unchanged if no rule matches', () => {
    expect(singularize('data')).toBe('data');
    expect(singularize('information')).toBe('information');
  });
});

describe('pluralize', () => {
  it('converts words ending in "f" to "ves"', () => {
    expect(pluralize('wife')).toBe('wives');
    expect(pluralize('knife')).toBe('knives');
    expect(pluralize('life')).toBe('lives');
  });

  it('converts words ending in "fe" to "ves"', () => {
    expect(pluralize('safe')).toBe('saves');
  });

  it('converts words ending in consonant + "y" to "ies"', () => {
    expect(pluralize('strategy')).toBe('strategies');
    expect(pluralize('entry')).toBe('entries');
    expect(pluralize('category')).toBe('categories');
  });

  it('does not convert words ending in vowel + "y"', () => {
    expect(pluralize('day')).toBe('days');
    expect(pluralize('key')).toBe('keys');
    expect(pluralize('boy')).toBe('boys');
  });

  it('converts words ending in "us" to "i"', () => {
    expect(pluralize('cactus')).toBe('cacti');
    expect(pluralize('fungus')).toBe('fungi');
  });

  it('converts words ending in "s" to "es"', () => {
    expect(pluralize('class')).toBe('classes');
    expect(pluralize('pass')).toBe('passes');
  });

  it('converts words ending in "x" to "es"', () => {
    expect(pluralize('box')).toBe('boxes');
    expect(pluralize('fox')).toBe('foxes');
  });

  it('converts words ending in "z" to "es"', () => {
    expect(pluralize('quiz')).toBe('quizzes');
  });

  it('converts words ending in "ch" to "es"', () => {
    expect(pluralize('watch')).toBe('watches');
    expect(pluralize('church')).toBe('churches');
  });

  it('converts words ending in "sh" to "es"', () => {
    expect(pluralize('wish')).toBe('wishes');
    expect(pluralize('dish')).toBe('dishes');
  });

  it('adds "s" to regular words', () => {
    expect(pluralize('paper')).toBe('papers');
    expect(pluralize('habit')).toBe('habits');
    expect(pluralize('reminder')).toBe('reminders');
  });
});
