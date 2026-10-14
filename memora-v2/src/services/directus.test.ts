import { beforeEach, describe, expect, it, vi } from 'vitest';
import { endSession, publishUnit, unpublishUnit, approveUnitReview, saveUnitDraft } from './directus';
import { previewUnit } from '../preview/previewUnit';

describe('escrituras de contenido', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    endSession();
    vi.restoreAllMocks();
  });

  it('rechaza guardar si la identidad no tiene política administrativa', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'user-1', role: null } }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })));

    await expect(saveUnitDraft(previewUnit)).rejects.toThrow('identidad administradora');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rechaza publicar si la identidad no tiene política administrativa', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'user-1', role: null } }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })));

    await expect(publishUnit(previewUnit.id)).rejects.toThrow('identidad administradora');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([unpublishUnit, approveUnitReview])('no permite cambiar revisiones ni retirar contenido a alumnos', async (action) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'student', role: null } }), { headers: { 'content-type': 'application/json' } })));
    await expect(action('unit')).rejects.toThrow('identidad administradora');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('despublicar solo cambia el estado y no borra contenido o intentos', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'admin', policies: [{ admin_access: true }] } }), { headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })));
    await unpublishUnit('example');
    expect(fetch).toHaveBeenLastCalledWith('/api/items/learning_units/example', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'draft' }) }));
  });

  it('no publica una escena sin revisión aunque la identidad sea administradora', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'admin', policies: [{ admin_access: true }] } }), { headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'example', ux_verdict: null, curriculum_verdict: null } }), { headers: { 'content-type': 'application/json' } })));
    await expect(publishUnit('example')).rejects.toThrow('revisión editorial');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('permite guardar a una identidad administradora y conserva el contenido validado', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { id: 'admin-1', policies: [{ admin_access: true }] },
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: previewUnit }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })));

    await expect(saveUnitDraft(previewUnit)).resolves.toEqual(previewUnit);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenLastCalledWith('/api/items/learning_units', expect.objectContaining({ method: 'POST' }));
  });
});
