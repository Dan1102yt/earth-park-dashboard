import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// null when env vars are absent (avoids crashing the module at load time)
export const supabase = url && key ? createClient(url, key) : null;
