

## Problem

`useTheme` is a standalone hook using local `useState`. Every component that calls it (Profile, ManagerSettings, QuickGameLobby, ThemeToggle, sonner) gets its **own independent copy** of the theme state. When navigating between pages:

1. Component A sets theme to "light" and writes to localStorage
2. Component A unmounts
3. Component B mounts with `useTheme()` — initializes from localStorage (correct so far)
4. But during this mount/unmount cycle, there can be race conditions where the `useEffect` in the old instance writes back a stale value, or the DOM class flickers

The core issue: **multiple independent `useState` instances** means theme state is not synchronized across the component tree. Each page mount re-initializes the hook, and the `useEffect` cleanup/init sequence can cause the `dark` class to toggle unexpectedly.

## Solution

Convert `useTheme` from a standalone hook into a **React Context provider** so there is exactly one source of truth for the theme across the entire app.

### Changes

1. **Create `ThemeProvider` context** (modify `src/hooks/useTheme.ts`):
   - Create a `ThemeContext` with `createContext`
   - Export a `ThemeProvider` component that holds the single `useState` and `useEffect` for applying/persisting the theme
   - Export `useTheme` as a context consumer hook

2. **Wrap the app** (modify `src/App.tsx`):
   - Add `<ThemeProvider>` near the top of the component tree (inside `QueryClientProvider`, outside `BrowserRouter`)

3. **No changes needed** in consumers (`Profile.tsx`, `ManagerSettings.tsx`, `QuickGameLobby.tsx`, `ThemeToggle`, etc.) — they already import `useTheme` from the same path and use the same API (`{ theme, setTheme, toggleTheme }`)

4. **Fix `sonner.tsx`**: It imports `useTheme` from `next-themes` (a different package). This should be updated to use the app's theme context or pass the theme prop, ensuring consistent theming for toast notifications.

