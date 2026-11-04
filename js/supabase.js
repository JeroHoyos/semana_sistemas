/* =============================================
   SUPABASE CONNECTION
   Shared by every page that reads or writes Supabase. Load it right after the supabase-js script.
   The session is kept in the browser by supabase-js: a page without the login dialog
   (evento.html) still knows who is logged in.
   ============================================= */

// This is Supabase's public (anon) key: it is made to live in the browser.
// The rules configured in Supabase are what protect the data. Never put the service_role key here.
const SUPABASE_URL = 'https://uwcdgpxdiigllqhhmyss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RncHhkaWlnbGxxaGhteXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MDc4ODUsImV4cCI6MjEwODI4Mzg4NX0.NuHGfN7un_7Qxg_uosrxtYcUouK593WdmQLrg9mjHjs';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
