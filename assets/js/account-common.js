// Shared by the account pages: the Supabase client, small DOM helpers and edge function calls.
// The anon key is public by design; every read is limited to the signed-in user by row-level security.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wksrtdjwylravpnocnut.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrc3J0ZGp3eWxyYXZwbm9jbnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjMxNDUsImV4cCI6MjEwNjQzOTE0NX0._tUHkibn5ZVSii13fxu9wZb1V6HTHfYvCndrTOVVk4Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const $ = (id) => document.getElementById(id);

export function message(id, text) {
  $(id).textContent = text || "";
  $(id).hidden = !text;
}

/** Calls an edge function as the signed-in user. */
export async function callFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has ended. Please sign in again.");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  return { ok: response.ok, result };
}

/** Emails a one-time code to this account's own address (the "Magic link" email template). */
export async function sendCode(email) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw error;
}

/** Runs once with the signed-in user; subpages send everyone else to the sign-in page. */
export function requireUser(onUser) {
  let started = false;
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) return location.replace("/account/");
    if (started) return;
    started = true;
    $("loading").hidden = true;
    // outside the auth callback: supabase-js holds a lock during it
    setTimeout(() => onUser(session.user), 0);
  });
}
