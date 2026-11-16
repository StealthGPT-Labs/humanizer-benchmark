import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type ModelAccess = 'not_checked' | 'confirmed' | 'unavailable' | 'on_hold' | 'model_mismatch';
export type KeyValidation = {
  status: 'verified' | 'credential_changed' | 'not_checked' | 'not_configured';
  checkedAt: string | null;
  method: string | null;
  endpoint: string | null;
  summary: string;
  evidence: 'reused_today' | 'live' | 'none';
  limitations: string[];
  modelAccess: ModelAccess;
  modelAccessMessage: string | null;
};
export type KeyCheckRecord = Omit<KeyValidation, 'status'> & {
  id: string;
  envKey: string;
  credentialTag: string;
  configurationHash: string | null;
};
type Environment = Readonly<Record<string, string | undefined>>;

export function getKeyValidation(
  id: string,
  envKey: string,
  env: Environment,
  settings?: Record<string, unknown>,
  records?: readonly KeyCheckRecord[],
): KeyValidation {
  const empty: KeyValidation = {
    status: env[envKey]?.trim() ? 'not_checked' : 'not_configured',
    checkedAt: null, method: null, endpoint: null,
    summary: 'No matching credential check is available.', evidence: 'none', limitations: [],
    modelAccess: 'not_checked', modelAccessMessage: null,
  };
  const key = env[envKey];
  if (!key?.trim()) return empty;
  if (records === undefined) {
    try {
      const parsed: unknown = JSON.parse(env.BENCHMARK_KEY_VERIFICATIONS ?? '[]');
      records = Array.isArray(parsed) ? parsed : [];
    } catch {
      return empty;
    }
  }
  const record = records.find(record => record?.id === id && record.envKey === envKey);
  const ownerSecret = env.BENCHMARK_OWNER_PASSWORD;
  if (!record || !ownerSecret || typeof record.credentialTag !== 'string' || !/^[a-f0-9]{64}$/.test(record.credentialTag)) return empty;
  const actual = createHmac('sha256', ownerSecret).update(`${id}\0${envKey}\0${key}`).digest();
  if (!timingSafeEqual(actual, Buffer.from(record.credentialTag, 'hex'))) {
    return { ...empty, status: 'credential_changed', summary: 'The loaded credential changed after verification. Recheck it before use.' };
  }
  const clean = (text: string) => text.split(key).join('[redacted]').split(ownerSecret).join('[redacted]').split(record.credentialTag).join('[redacted]');
  const currentHash = settings ? createHash('sha256').update(JSON.stringify(settings)).digest('hex') : null;
  const validModelBinding = typeof record.configurationHash === 'string' && /^[a-f0-9]{64}$/.test(record.configurationHash) && currentHash === record.configurationHash;
  const sameSettings = record.modelAccess === 'not_checked' || validModelBinding;
  const allowedAccess: ModelAccess[] = ['not_checked', 'confirmed', 'unavailable', 'on_hold', 'model_mismatch'];
  const checkedAt = typeof record.checkedAt === 'string'
    && clean(record.checkedAt) === record.checkedAt
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(record.checkedAt)
    && Number.isFinite(Date.parse(record.checkedAt))
      ? record.checkedAt : null;
  return {
    status: 'verified',
    checkedAt,
    method: typeof record.method === 'string' ? clean(record.method) : null,
    endpoint: typeof record.endpoint === 'string' ? clean(record.endpoint) : null,
    summary: typeof record.summary === 'string' ? clean(record.summary) : 'Credential check passed.',
    evidence: record.evidence === 'live' || record.evidence === 'reused_today' ? record.evidence : 'none',
    limitations: Array.isArray(record.limitations) ? record.limitations.filter(item => typeof item === 'string').map(clean) : [],
    modelAccess: sameSettings && allowedAccess.includes(record.modelAccess) ? record.modelAccess : 'not_checked',
    modelAccessMessage: sameSettings
      ? typeof record.modelAccessMessage === 'string' ? clean(record.modelAccessMessage) : null
      : 'Requested settings changed after the check. Model access needs checking again.',
  };
}
