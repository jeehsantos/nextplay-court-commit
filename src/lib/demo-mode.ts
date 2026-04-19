/**
 * Demo Mode helper.
 *
 * Toggle by setting `VITE_DEMO_MODE=true` in .env (or in Lovable env).
 * When enabled, several player & manager pages bypass real Supabase queries
 * and render the static fixtures from `src/data/demo/*` instead.
 *
 * Auth is NOT bypassed — recorder still logs in as normal.
 * Mutations (booking, joining lobbies, etc.) are NOT stubbed.
 */
export const isDemoMode = (): boolean => {
  return import.meta.env.VITE_DEMO_MODE === "true";
};
