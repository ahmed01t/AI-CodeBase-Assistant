import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cnnrjrxykpdchbbzgrtb.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_8k6NmUexN52pEE-qih-bWw_MNHblOvp";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

