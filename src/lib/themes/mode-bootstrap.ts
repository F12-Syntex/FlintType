/** Server-safe bootstrap helpers for the light/dark mode system.
 *
 *  Kept separate from `use-mode.ts` (which is "use client") so the root
 *  layout — a server component — can import `buildModeBootstrapScript`
 *  to inject the inline <script> without RSC complaining about reaching
 *  into a client module. */

export const MODE_STORAGE_KEY = "ft-mode";

export type Mode = "light" | "dark" | "system";

/** Inline-script body that runs in <head> before paint, so the saved
 *  mode (light/dark/system → resolved) is on the html element before
 *  the first frame. Prevents the dark→light flash. */
export function buildModeBootstrapScript(): string {
  const key = JSON.stringify(MODE_STORAGE_KEY);
  return `(function(){try{var m=localStorage.getItem(${key});var resolved=m;if(!m||m==='system')resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(resolved==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;
}
