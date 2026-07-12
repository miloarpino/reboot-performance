import { initialState } from "./seed.mjs";
import { clone } from "./domain.mjs";

const KEY = "reboot-performance-v2-phase1";

export function loadState() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return clone(initialState);
    const parsed = JSON.parse(raw);
    return parsed.schemaVersion === initialState.schemaVersion ? parsed : clone(initialState);
  } catch {
    return clone(initialState);
  }
}

export function saveState(state) {
  globalThis.localStorage?.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  globalThis.localStorage?.removeItem(KEY);
  return clone(initialState);
}
