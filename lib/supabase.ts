import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isUrlValid = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const finalUrl = isUrlValid(supabaseUrl) ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-anon-key';

if (!supabaseUrl || !supabaseAnonKey || !isUrlValid(supabaseUrl)) {
  console.warn(
    '⚠️ NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid! Focus OS is running in Offline Fallback Simulation Mode.'
  );
}

export const supabase = createClient(finalUrl, finalKey);
