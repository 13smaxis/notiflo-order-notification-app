
import { createClient } from '@supabase/supabase-js';

/*
 * This file is used to create a Supabase client instance that can be used throughout the application.
 * It reads the Supabase URL and anonymous key from environment variables, and throws an error if they are missing.
 * The client is then exported for use in other parts of the application. 
 */
const meta = import.meta as ImportMeta & {
  env?: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
};

const supabaseUrl = meta.env?.VITE_SUPABASE_URL || 'https://tztkclxftbzdcuidvtag.supabase.co';
const supabaseKey = meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jxS9BcFKgHbSUCOEM06BAQ_JrZ4Y06v';

if (!supabaseUrl || !supabaseKey) 
{
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

