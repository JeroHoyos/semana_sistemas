/* =============================================
   SUPABASE CONNECTION
   Shared by every page that reads or writes Supabase.
   The session is kept in the browser by supabase-js: a page without the login dialog
   (evento.html) still knows who is logged in.
   ============================================= */

import { createClient } from '@supabase/supabase-js';

// This is Supabase's public (anon) key: it is made to live in the browser.
// The rules configured in Supabase are what protect the data. Never put the service_role key here.
const SUPABASE_URL = 'https://uwcdgpxdiigllqhhmyss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RncHhkaWlnbGxxaGhteXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MDc4ODUsImV4cCI6MjEwODI4Mzg4NX0.NuHGfN7un_7Qxg_uosrxtYcUouK593WdmQLrg9mjHjs';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase errors (they come in English), explained to the person in Spanish
const SUPABASE_ERRORS = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'User already registered': 'Este correo ya tiene un carnet. Ve a la pestaña Ingresar.',
};

export function translateError(error) {
  const message = error.message || 'No se pudo completar la operación.';
  const known = Object.keys(SUPABASE_ERRORS).find((text) => message.includes(text));
  return known ? SUPABASE_ERRORS[known] : message;
}
