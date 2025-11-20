import { createClient } from "@supabase/supabase-js";

// URL do seu projeto Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;

// Chave pública do projeto (publishable key)
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL ou Publishable Key não definida no .env");
}

// Cria o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);
