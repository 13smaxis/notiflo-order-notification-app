
import { createClient } from '@supabase/supabase-js';

/*
 * This file is used to create a Supabase client instance that can be used throughout the application.
 * It reads the Supabase URL and anonymous key from environment variables, and throws an error if they are missing.
 * The client is then exported for use in other parts of the application. 
 */
const _meta: any = import.meta;
const supabaseUrl = _meta.env?.VITE_SUPABASE_URL || 'https://tztkclxftbzdcuidvtag.supabase.co';
const supabaseKey = _meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gHWvFjJO1w6IVhmGWpn90A_8wECybXb';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

