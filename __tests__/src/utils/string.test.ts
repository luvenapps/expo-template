import { toSnakeCase } from '@/utils/string';

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
