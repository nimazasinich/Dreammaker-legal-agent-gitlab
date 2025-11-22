// src/utils/integrationGuards.ts
export type ApiEnvelope = {
  status: 'ok' | 'error';
  code?: string;
  message?: string;
  data?: any;
};

export function isValidEnvelope(obj: any): obj is ApiEnvelope {
  return obj && (obj.status === 'ok' || obj.status === 'error');
}

/**
 * NormalizeApiResult
 * - If invalid JSON or missing envelope -> return an "error" envelope with deterministic code
 * - This function centralizes fallback decisions used by components
 */
export function normalizeApiResult(raw: any): ApiEnvelope {
  if (!raw) {
    return { status: 'error', code: 'DATA_UNAVAILABLE', message: 'Empty response', data: null };
  }
  if (isValidEnvelope(raw)) {
    return raw;
  }
  return { status: 'error', code: 'INVALID_ENVELOPE', message: 'API returned invalid shape', data: null };
}

/**
 * preFlightGuard
 * - Ensure required config present, otherwise return DISABLED_BY_CONFIG
 */
export function preFlightGuard(configOk: boolean, requiredKeys: string[] = []) {
  if (!configOk) {
    return { status: 'error', code: 'DISABLED_BY_CONFIG', message: 'Missing configuration', data: null } as ApiEnvelope;
  }
  return null;
}
