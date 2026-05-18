import { createClient } from '@supabase/supabase-js';

// Gunakan URL dasar (pastikan tidak ada /rest/v1/ di ujungnya)
const supabaseUrl = 'https://rfwmersaocjvcjkiiuby.supabase.co'; 

// Masukkan Publishable key yang ada di screenshot kamu
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmd21lcnNhb2NqdmNqa2lpdWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTczMzAsImV4cCI6MjA5MzM5MzMzMH0.0_cj0a8xGWlf_egsSc7H5KkvqsQtmRcEm9LyloaOrTY'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);