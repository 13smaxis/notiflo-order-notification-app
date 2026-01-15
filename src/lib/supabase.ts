import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://dzdilgucbxxmhlaeiqfy.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjQ3Y2Y0MzBlLTk2YjQtNDM3MS04Yjg4LWZiMDcwZDFkOWUyMiJ9.eyJwcm9qZWN0SWQiOiJkemRpbGd1Y2J4eG1obGFlaXFmeSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY4NDg4MzE0LCJleHAiOjIwODM4NDgzMTQsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.y2JwU8dlDZK7p5mVHtjXtE7e9uLfXOEn93XAw6oL4cw';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };