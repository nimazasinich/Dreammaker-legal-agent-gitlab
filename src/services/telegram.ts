import fetch from "node-fetch";
import { readTelegramConfig, writeTelegramConfig } from "../core/secureStore.js";

export type TelegramConfig = {
  enabled?: boolean;
  onHighSeverity?: boolean;
  onLiquidation?: boolean;
  token?: string;
  chatId?: string;
};

export function getTelegramConfig(): TelegramConfig {
  const cfg = readTelegramConfig() || {};
  return {
    enabled: !!cfg.enabled,
    onHighSeverity: !!cfg.onHighSeverity,
    onLiquidation: !!cfg.onLiquidation,
    token: cfg.token ? String(cfg.token) : undefined,
    chatId: cfg.chatId ? String(cfg.chatId) : undefined,
  };
}

export function setTelegramConfig(patch: Partial<TelegramConfig>) {
  const curr = getTelegramConfig();
  const next: TelegramConfig = {
    enabled: patch.enabled ?? curr.enabled ?? false,
    onHighSeverity: patch.onHighSeverity ?? curr.onHighSeverity ?? false,
    onLiquidation: patch.onLiquidation ?? curr.onLiquidation ?? false,
    token: patch.token ? patch.token.trim() : curr.token,
    chatId: patch.chatId ? String(patch.chatId).trim() : curr.chatId,
  };
  writeTelegramConfig(next);
  return next;
}

async function sendMessageInternal(text: string) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return { ok: false, reason: "unconfigured" };
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: controller.signal as any,
    });
    clearTimeout(t);
    const j: any = await res.json();
    return { ok: !!j.ok };
  } catch {
    clearTimeout(t);
    return { ok: false };
  }
}

export async function sendTelegramMessage(text: string) {
  const a = await sendMessageInternal(text);
  if (a.ok) return a;
  return await sendMessageInternal(text);
}

export async function notifyHighSeverity(payload: {
  symbol: string; side: "LONG" | "SHORT"; score: number; timeframe: string; price: number; riskPct?: number;
}) {
  const cfg = getTelegramConfig();
  if (!cfg.enabled || !cfg.onHighSeverity) return { skipped: true };
  const text =
    `🚨 High-Severity Signal\n` +
    `Symbol: ${payload.symbol} | Side: ${payload.side} | Score: ${payload.score}\n` +
    `TF: ${payload.timeframe} | Price: ${payload.price}` +
    (payload.riskPct != null ? ` | Risk: ${payload.riskPct}%` : "");
  return await sendTelegramMessage(text);
}

export async function notifyLiquidation(payload: {
  symbol: string; leverage?: number; liqPrice?: number; margin?: number; price: number;
}) {
  const cfg = getTelegramConfig();
  if (!cfg.enabled || !cfg.onLiquidation) return { skipped: true };
  const text =
    `⚠️ Liquidation Risk\n` +
    `Symbol: ${payload.symbol}` +
    (payload.leverage != null ? ` | Leverage: ${payload.leverage}` : "") +
    (payload.liqPrice != null ? ` | LiqPrice: ${payload.liqPrice}` : "") +
    (payload.margin != null ? ` | Margin: ${payload.margin}` : "") +
    `\nCurrent: ${payload.price}`;
  return await sendTelegramMessage(text);
}
