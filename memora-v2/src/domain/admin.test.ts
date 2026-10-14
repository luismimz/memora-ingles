import { describe, expect, it } from 'vitest';
import { hasAdminPolicy } from './admin';

describe('acceso al revisor', () => {
  it('reconoce una política administradora directa o heredada del rol', () => {
    expect(hasAdminPolicy({ id: 'a', policies: [{ policy: { admin_access: true } }] })).toBe(true);
    expect(hasAdminPolicy({ id: 'a', role: { policies: [{ policy: { admin_access: true } }] } })).toBe(true);
  });

  it('no confunde identidad o perfil con autorización', () => {
    expect(hasAdminPolicy({ id: '22', role: { policies: [{ policy: { admin_access: false } }] } })).toBe(false);
    expect(hasAdminPolicy({ id: '23' })).toBe(false);
  });
});
