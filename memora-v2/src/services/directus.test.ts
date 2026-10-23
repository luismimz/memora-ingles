import { beforeEach, describe, expect, it, vi } from 'vitest';
import { endSession, publishUnit, unpublishUnit, approveUnitReview, saveUnitDraft, loadLearningLibrary, loadPublishedUnitSummaries } from './directus';
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

describe('lectura tolerante de gramática publicada', () => {
  it('limita las solicitudes simultáneas para no saturar Directus', async () => {
    let active = 0; let peak = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      active++; peak = Math.max(peak, active);
      await Promise.resolve(); active--;
      return new Response(JSON.stringify({ data: { status: 'published', content: previewUnit } }), { headers: { 'content-type': 'application/json' } });
    }));
    const result = await loadLearningLibrary(Array.from({ length: 17 }, (_, index) => ({ id: `unit-${index}`, title: 'Unidad' })), 'grammar');
    expect(result.units).toHaveLength(17); expect(peak).toBeLessThanOrEqual(6);
  });
  it('una publicación defectuosa no oculta las lecciones válidas ni descarga los paquetes', async () => {
    const request = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/good?')) return new Response(JSON.stringify({ data: { status: 'published', content: previewUnit } }), { headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify({ data: { status: 'published', content: {} } }), { headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', request);
    const result = await loadLearningLibrary([{ id: 'good', title: 'Bien' }, { id: 'bad', title: 'Revisar' }, { id: 'words', title: 'Palabras', kind: 'vocabulary-pack' }], 'grammar');
    expect(result.units).toEqual([previewUnit]);
    expect(result.failed).toEqual(['Revisar']);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('extrae metadatos de trucos sin que una publicación dañada rompa el mapa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'good', title: 'Bien', status: 'published', content: previewUnit }, { id: 'bad', title: 'Revisar', status: 'published', content: {} }] }), { headers: { 'content-type': 'application/json' } })));
    const summaries = await loadPublishedUnitSummaries();
    expect(summaries.find((summary) => summary.id === 'good')!.grammarTricks!.length).toBeGreaterThan(0);
    expect(summaries.find((summary) => summary.id === 'bad')!.grammarTricks).toEqual([]);
  });
  it('conserva identidad y versión de asociación en el resumen sin importar contenido ni escribir progreso', async () => {
    const content = { ...previewUnit, words: previewUnit.words.map((word, index) => index === 0 ? { ...word, associationId: 'reviewed-play', associationVersion: 2 } : word) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: content.id, title: content.title, status: 'published', content }] }), { headers: { 'content-type': 'application/json' } })));
    const summaries = await loadPublishedUnitSummaries();
    expect(summaries[0].words![0]).toMatchObject({ en: content.words[0].en, es: content.words[0].es, associationId: 'reviewed-play', associationVersion: 2 });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('estabiliza el catálogo por ID aunque Directus responda en otro orden', async () => {
    const records = ['pack-10', 'pack-2', 'pack-1'].map((id) => ({ id, title: id, status: 'published', content: previewUnit }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: records }), { headers: { 'content-type': 'application/json' } })));
    expect((await loadPublishedUnitSummaries()).map((summary) => summary.id)).toEqual(['pack-1', 'pack-2', 'pack-10']);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('&sort=id'), expect.anything());
  });
});
