import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://rfwmersaocjvcjkiiuby.supabase.co";

const supabaseAnonKey =
  "sb_publishable_gYLlpLNegjHq8N2vu50DsA_Fq8rlkjZ";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);