export const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
export const IS_PWA = !IS_TAURI;
export const IS_SYNC = !IS_TAURI && import.meta.env.VITE_BUILD_TARGET === "sync";
export const IS_MOBILE = IS_PWA && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
