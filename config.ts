
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos valores con los de tu proyecto en:
// Supabase Dashboard -> Project Settings -> API

// We explicitly type these as string to avoid TypeScript literal narrowing that leads to 'never' types in conditional logic.
export const SUPABASE_URL: string = "https://iukchvkoumfwaxlgfhso.supabase.co"; 
export const SUPABASE_ANON_KEY: string = "sb_publishable_tU4JK8pWLr3axCj3jG88dg_EIK5aiO-";

// Feature Flags
// El sistema detecta automáticamente si hay una URL configurada para activar las funciones de nube
export const ENABLE_CLOUD_SAVES = SUPABASE_URL !== "https://iukchvkoumfwaxlgfhso.supabase.co" && SUPABASE_URL.includes("supabase.co");