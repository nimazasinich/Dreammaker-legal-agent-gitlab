/**
 * API Guards Unit Tests
 * 
 * Validates envelope checking, fallback states, and integration guards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidEnvelope,
  validateEnvelope,
  createFallbackState,
  FallbackCode,
  checkConfigExists,
  fetchWithGuard,
  isFallbackState,
  getFallbackMessage,
} from '../../src/lib/apiGuards';

describe('API Guards', () => {
  describe('isValidEnvelope', () => {
    it('returns true for valid ok envelope', () => {
      const envelope = { status: 'ok', data: { foo: 'bar' } };
      expect(isValidEnvelope(envelope)).toBe(true);
    });

    it('returns true for valid error envelope', () => {
      const envelope = { status: 'error', code: 'TEST_ERROR', message: 'Test error' };
      expect(isValidEnvelope(envelope)).toBe(true);
    });

    it('returns false for missing status', () => {
      const envelope = { data: { foo: 'bar' } };
      expect(isValidEnvelope(envelope)).toBe(false);
    });

    it('returns false for invalid status value', () => {
      const envelope = { status: 'success', data: {} };
      expect(isValidEnvelope(envelope)).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isValidEnvelope(null)).toBe(false);
      expect(isValidEnvelope(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isValidEnvelope('string')).toBe(false);
      expect(isValidEnvelope(123)).toBe(false);
      expect(isValidEnvelope([])).toBe(false);
    });
  });

  describe('validateEnvelope', () => {
    it('extracts data from ok envelope', () => {
      const envelope = { status: 'ok', data: { foo: 'bar' } };
      const result = validateEnvelope(envelope, 'test');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('throws on error envelope', () => {
      const envelope = { status: 'error', message: 'Test error' };
      expect(() => validateEnvelope(envelope, 'test')).toThrow('Test error');
    });

    it('throws on invalid envelope', () => {
      const envelope = { data: {} };
      expect(() => validateEnvelope(envelope, 'test')).toThrow('Invalid response envelope');
    });

    it('throws on error envelope with code', () => {
      const envelope = { status: 'error', code: 'TEST_ERROR', message: 'Test error' };
      expect(() => validateEnvelope(envelope, 'test')).toThrow('Test error');
    });
  });

  describe('createFallbackState', () => {
    it('creates fallback state with code and message', () => {
      const state = createFallbackState(
        FallbackCode.DATA_UNAVAILABLE,
        'Test message'
      );
      
      expect(state.code).toBe(FallbackCode.DATA_UNAVAILABLE);
      expect(state.message).toBe('Test message');
      expect(state.timestamp).toBeGreaterThan(0);
      expect(state.hint).toBeUndefined();
    });

    it('includes hint when provided', () => {
      const state = createFallbackState(
        FallbackCode.DISABLED_BY_CONFIG,
        'Feature disabled',
        'Enable in settings'
      );
      
      expect(state.hint).toBe('Enable in settings');
    });

    it('creates unique timestamps', async () => {
      const state1 = createFallbackState(FallbackCode.DATA_UNAVAILABLE, 'Test 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      const state2 = createFallbackState(FallbackCode.DATA_UNAVAILABLE, 'Test 2');
      
      expect(state2.timestamp).toBeGreaterThan(state1.timestamp);
    });
  });

  describe('isFallbackState', () => {
    it('returns true for valid fallback state', () => {
      const state = createFallbackState(FallbackCode.DATA_UNAVAILABLE, 'Test');
      expect(isFallbackState(state)).toBe(true);
    });

    it('returns false for non-fallback objects', () => {
      expect(isFallbackState({})).toBe(false);
      expect(isFallbackState({ code: 'INVALID' })).toBe(false);
      expect(isFallbackState({ message: 'Test' })).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isFallbackState(null)).toBe(false);
      expect(isFallbackState(undefined)).toBe(false);
    });
  });

  describe('getFallbackMessage', () => {
    it('returns standard message for known codes', () => {
      const state = createFallbackState(FallbackCode.KUCOIN_UNAVAILABLE, 'Original');
      expect(getFallbackMessage(state)).toBe('KuCoin integration is unavailable');
    });

    it('returns custom message for unknown codes', () => {
      const state = {
        code: 'UNKNOWN' as any,
        message: 'Custom message',
        timestamp: Date.now(),
      };
      expect(getFallbackMessage(state)).toBe('Custom message');
    });
  });

  describe('checkConfigExists', () => {
    beforeEach(() => {
      // Reset env vars
      vi.stubEnv('VITE_KUCOIN_API_KEY', '');
      vi.stubEnv('KUCOIN_API_KEY', '');
    });

    it('returns false when config missing', () => {
      expect(checkConfigExists('kucoin')).toBe(false);
      expect(checkConfigExists('binance')).toBe(false);
    });

    it('returns true when VITE_ prefixed config exists', () => {
      vi.stubEnv('VITE_KUCOIN_API_KEY', 'test-key');
      expect(checkConfigExists('kucoin')).toBe(true);
    });

    it('returns false for unknown services', () => {
      expect(checkConfigExists('unknown-service')).toBe(false);
    });
  });

  describe('fetchWithGuard', () => {
    const mockFetch = vi.fn();
    
    beforeEach(() => {
      global.fetch = mockFetch;
      mockFetch.mockReset();
    });

    it('returns data on successful envelope response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', data: { foo: 'bar' } }),
      });

      const result = await fetchWithGuard('http://test.com/api', {}, 'test');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ foo: 'bar' });
      }
    });

    it('returns fallback on 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await fetchWithGuard('http://test.com/api', {}, 'test');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fallback.code).toBe(FallbackCode.DATA_UNAVAILABLE);
      }
    });

    it('returns fallback on 503', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const result = await fetchWithGuard('http://test.com/api', {}, 'test');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fallback.code).toBe(FallbackCode.BACKEND_OFFLINE);
      }
    });

    it('returns fallback on network error', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      const result = await fetchWithGuard('http://test.com/api', {}, 'test');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fallback.code).toBe(FallbackCode.NETWORK_ERROR);
      }
    });

    it('returns fallback on invalid envelope', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }), // Missing status
      });

      const result = await fetchWithGuard('http://test.com/api', {}, 'test');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fallback.code).toBe(FallbackCode.DATA_UNAVAILABLE);
      }
    });
  });
});
