// Selección de capa de datos:
// - Si SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY están definidos -> Supabase (PostgreSQL)
// - Si no -> SQLite local (better-sqlite3)

const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export const MODE = useSupabase ? 'supabase' : 'sqlite';

export const store = useSupabase
  ? (await import('./supabase.js')).store
  : (await import('./sqlite.js')).store;
