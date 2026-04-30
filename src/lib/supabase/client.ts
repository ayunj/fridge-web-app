import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

export const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
);

