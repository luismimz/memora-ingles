import { validateApprovedAssociation, validateAssociationQuality, validateUnit, type AtomicUnit } from '../domain/unit';
import { hasAdminPolicy, type Identity } from '../domain/admin';
import { grammarTricks, type JourneyTrick } from '../domain/journeyTricks';

const API = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'memora-v2.auth';

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

let session: Session | null = (() => {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null') as Session | null; }
  catch { return null; }
})();
let refreshRequest: Promise<boolean> | null = null;
let currentIdentity: { id: string; isAdmin: boolean } | null = null;

export class DirectusError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function persist(next: Session | null) {
  session = next;
  try { next ? localStorage.setItem(TOKEN_KEY, JSON.stringify(next)) : localStorage.removeItem(TOKEN_KEY); }
  catch { /* El modo privado no impide jugar durante la sesión. */ }
}

export function hasSession() { return Boolean(session); }
export function endSession() { currentIdentity = null; persist(null); }

export async function logIn(email: string, password: string): Promise<void> {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.errors?.[0]?.message || 'No se pudo iniciar sesión.');
  const data = payload.data as { access_token: string; refresh_token: string; expires: number };
  persist({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires - 15_000 });
  currentIdentity = null;
}

async function refresh(): Promise<boolean> {
  if (!session?.refresh_token) return false;
  refreshRequest ??= (async () => {
    try {
      const response = await fetch(`${API}/auth/refresh`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: session?.refresh_token, mode: 'json' }),
      });
      if (!response.ok) { persist(null); return false; }
      const data = (await response.json()).data as { access_token: string; refresh_token: string; expires: number };
      persist({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires - 15_000 });
      return true;
    } finally { refreshRequest = null; }
  })();
  return refreshRequest;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  if (session && Date.now() >= session.expires_at) await refresh();
  const headers = new Headers(init.headers);
  if (session) headers.set('authorization', `Bearer ${session.access_token}`);
  const response = await fetch(`${API}${path}`, { ...init, headers });
  if (response.status === 401 && retry && await refresh()) return apiRequest<T>(path, init, false);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new DirectusError(payload?.errors?.[0]?.message || payload?.error || `Directus: ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('json')) return await response.blob() as T;
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

export interface UnitRecord { id: string; status: string; content: unknown }
export async function loadKeysPilot(signal?: AbortSignal): Promise<AtomicUnit | null> {
  if (!import.meta.env.DEV) return null;
  const content = await apiRequest<unknown>('/memora/pilot/keys', { signal }).catch((error) => { if (error instanceof DirectusError && error.status === 403) return null; throw error; });
  return content ? validateUnit(content) : null;
}
/** Draft access is still enforced by Directus. This never bypasses collection permissions. */
export async function loadMirrorPilot(signal?: AbortSignal): Promise<AtomicUnit | null> {
  if (!import.meta.env.DEV) return null;
  const records = await apiRequest<UnitRecord[]>('/items/learning_units?filter[id][_eq]=m1-mirror-now&filter[status][_eq]=draft&fields=id,status,content&limit=1', { signal }).catch((error) => { if (error instanceof DirectusError && error.status === 403) return []; throw error; });
  const content = records[0]?.content as { pilot?: string } | undefined;
  return content?.pilot === 'mirror-cycle-v1' ? validateUnit(content) : null;
}
export interface UnitSummary {
  id: string;
  title: string;
  kind?: AtomicUnit['kind'];
  grammarTricks?: JourneyTrick[];
  routeTrick?: JourneyTrick;
  contentVersion?: string;
  location?: AtomicUnit['location'];
  hasDialogue?: boolean;
  teaser?: string;
  words?: Array<Pick<AtomicUnit['words'][number], 'en' | 'es' | 'associationMode' | 'associationId' | 'associationVersion'>>;
  sentence?: Pick<AtomicUnit['sentence'], 'en' | 'es'>;
}

export interface ManagedUnitSummary extends UnitSummary {
  status: 'draft' | 'published';
  ux_verdict?: 'approved' | 'repairable' | 'rejected' | null;
  dropout_risk?: number | null;
  curriculum_verdict?: 'approved' | 'repairable' | 'rejected' | null;
}

export async function loadManagedUnitSummaries(signal?: AbortSignal): Promise<ManagedUnitSummary[]> {
  let records: ManagedUnitSummary[];
  try {
    records = await apiRequest<ManagedUnitSummary[]>(
      '/items/learning_units?fields=id,title,status,ux_verdict,dropout_risk,curriculum_verdict&limit=-1&sort=title', { signal },
    );
  } catch {
    records = await apiRequest<ManagedUnitSummary[]>(
      '/items/learning_units?fields=id,title,status&limit=-1&sort=title', { signal },
    );
  }
  return records.filter((record) => record.id && record.title && ['draft', 'published'].includes(record.status));
}

export async function loadManagedUnit(id: string, signal?: AbortSignal): Promise<AtomicUnit> {
  const record = await apiRequest<UnitRecord>(`/items/learning_units/${encodeURIComponent(id)}?fields=id,status,content`, { signal });
  return validateUnit(record.content);
}

export async function saveUnitDraft(value: unknown): Promise<AtomicUnit> {
  await requireAdmin();
  const unit = validateUnit(value);
  // A missing item can be reported as 403 by Directus, even for an administrator.
  // Query the collection instead so new drafts remain creatable from the UI.
  const matches = await apiRequest<UnitRecord[]>(
    `/items/learning_units?filter[id][_eq]=${encodeURIComponent(unit.id)}&fields=id,status&limit=1`,
  );
  const existing = matches[0] ?? null;
  if (existing?.status === 'published') throw new Error('Esta escena ya está publicada. Crea un borrador nuevo para revisarla.');
  const draft = { title: unit.title, status: 'draft', content: unit, ux_verdict: null, curriculum_verdict: null, ux_audit: null, curriculum_audit: null };
  const body = JSON.stringify(draft);
  if (existing) {
    await apiRequest(`/items/learning_units/${encodeURIComponent(unit.id)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body,
    });
  } else {
    await apiRequest('/items/learning_units', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: unit.id, ...draft }),
    });
  }
  return unit;
}

export async function publishUnit(id: string): Promise<void> {
  await requireAdmin();
  const review = await apiRequest<ManagedUnitSummary>(`/items/learning_units/${encodeURIComponent(id)}?fields=id,ux_verdict,curriculum_verdict`);
  if (review.ux_verdict !== 'approved' || review.curriculum_verdict !== 'approved') throw new Error('Primero prueba y aprueba la revisión editorial.');
  const unit = await loadManagedUnit(id);
  unit.words.forEach(validateApprovedAssociation);
  await apiRequest(`/items/learning_units/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'published' }),
  });
}

export async function unpublishUnit(id: string): Promise<void> {
  await requireAdmin();
  await apiRequest(`/items/learning_units/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'draft' }),
  });
}

/** Manual editorial approval never publishes or fabricates media provenance. */
export async function approveUnitReview(id: string): Promise<void> {
  await requireAdmin();
  const unit = await loadManagedUnit(id);
  for (const word of unit.words) {
    if (validateAssociationQuality(word).automatedGate !== 'pass') throw new Error(`${word.en}: corrige la asociación antes de aprobar.`);
  }
  const audit = { reviewer: currentIdentity!.id, reviewedAt: new Date().toISOString(), source: 'manual-profile-review' };
  await apiRequest(`/items/learning_units/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ux_verdict: 'approved', curriculum_verdict: 'approved', ux_audit: audit, curriculum_audit: audit }),
  });
}

export async function loadIdentity(signal?: AbortSignal): Promise<{ id: string; isAdmin: boolean }> {
  try {
    const identity = await apiRequest<Identity>('/users/me?fields=id,role.policies.policy.admin_access,policies.policy.admin_access', { signal });
    currentIdentity = { id: identity.id, isAdmin: hasAdminPolicy(identity) };
    return currentIdentity;
  } catch (error) {
    if (signal?.aborted) throw error;
    const identity = await apiRequest<{ id: string }>('/users/me?fields=id', { signal });
    currentIdentity = { id: identity.id, isAdmin: false };
    return currentIdentity;
  }
}

async function requireAdmin(): Promise<void> {
  if (!currentIdentity) await loadIdentity();
  if (!currentIdentity?.isAdmin) throw new Error('Se necesita una identidad administradora para modificar contenido.');
}

/** No crea contenido ni elige asociaciones alternativas: solo lee una unidad publicada. */
export async function loadUnit(id: string, signal?: AbortSignal): Promise<AtomicUnit> {
  const record = await apiRequest<UnitRecord>(`/items/learning_units/${encodeURIComponent(id)}?fields=id,status,content`, { signal });
  if (record.status !== 'published') throw new Error('Esta unidad aún no está publicada.');
  return validateUnit(record.content);
}

/** El recorrido solo recibe metadatos: las escenas se descargan al abrirlas. */
export async function loadPublishedUnitSummaries(signal?: AbortSignal): Promise<UnitSummary[]> {
  const records = await apiRequest<Array<{ id: string; title: string; status: string; content?: unknown }>>(
    '/items/learning_units?filter[status][_eq]=published&fields=id,title,status,content&limit=-1&sort=id',
    { signal },
  );
  // El recorrido muestra cualquier unidad publicada con metadatos válidos.
  // Solo se excluyen los registros legacy `stage…`; el identificador de una
  // misión nueva no debe obligar a seguir el formato histórico `m<number>-…`.
  const units: UnitSummary[] = records.filter((record) => record.status === 'published' && !/^stage/i.test(record.id) && record.id)
    .map(({ id, title, content }): UnitSummary | null => {
      const unit = content && typeof content === 'object' ? content as Partial<AtomicUnit> : null;
      const resolvedTitle = title || unit?.title;
      if (typeof resolvedTitle !== 'string' || !resolvedTitle.trim()) return null;
      let tricks: JourneyTrick[] = [];
      try { tricks = grammarTricks(validateUnit(content)); } catch { /* A malformed story cannot block the map or other grammar lessons. */ }
      return {
        id,
        title: resolvedTitle,
        kind: unit?.kind,
        grammarTricks: tricks,
        contentVersion: unit?.contentVersion,
        location: unit?.location,
        hasDialogue: Boolean(unit?.communication?.dialogue),
        teaser: unit?.communication?.dialogue?.context,
        words: Array.isArray(unit?.words) ? unit.words.filter((word) => word && typeof word.en === 'string' && typeof word.es === 'string').map(({ en, es, associationMode, associationId, associationVersion }) => ({ en, es, associationMode, ...(associationId !== undefined ? { associationId } : {}), ...(associationVersion !== undefined ? { associationVersion } : {}) })) : undefined,
        sentence: unit?.sentence?.en && unit.sentence.es ? { en: unit.sentence.en, es: unit.sentence.es } : undefined,
      };
    }).filter((unit): unit is UnitSummary => unit !== null);
  if (units.length) return units.sort((left, right) => left.id.localeCompare(right.id, 'en', { numeric: true }));
  return [];
}

/** Bounded partial loading: one broken publication must not take down a library. */
export async function loadLearningLibrary(summaries: readonly UnitSummary[], mode: 'vocabulary' | 'grammar'): Promise<{ units: AtomicUnit[]; failed: string[] }> {
  const candidates = summaries.filter((summary) => mode === 'grammar' ? summary.kind !== 'vocabulary-pack' : summary.kind !== 'grammar-lesson');
  const units: AtomicUnit[] = [];
  const failed: string[] = [];
  for (let offset = 0; offset < candidates.length; offset += 6) {
    const batch = candidates.slice(offset, offset + 6);
    const results = await Promise.allSettled(batch.map((summary) => loadUnit(summary.id)));
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') units.push(result.value);
      else failed.push(batch[index].title);
    });
  }
  return { units, failed };
}

const assets = new Map<string, string>();

export async function loadAsset(id: string, signal?: AbortSignal): Promise<string> {
  const cached = assets.get(id);
  if (cached) return cached;
  const blob = await apiRequest<Blob>(`/assets/${encodeURIComponent(id)}`, { signal });
  const url = URL.createObjectURL(blob);
  assets.set(id, url);
  return url;
}

export function clearAssetCache() {
  for (const url of assets.values()) URL.revokeObjectURL(url);
  assets.clear();
}
