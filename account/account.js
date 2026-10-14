// Screendial account page: sign in or up, see your history, delete your account.
// The anon key is public by design; every read is limited to the signed-in user by
// row-level security, and deletion goes through the delete-account edge function.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wksrtdjwylravpnocnut.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrc3J0ZGp3eWxyYXZwbm9jbnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjMxNDUsImV4cCI6MjEwNjQzOTE0NX0._tUHkibn5ZVSii13fxu9wZb1V6HTHfYvCndrTOVVk4Y";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

let mode = "signin";

function show(view) {
  $("loading").hidden = true;
  for (const id of ["auth-view", "account-view", "deleted-view"]) $(id).hidden = id !== view;
}

function message(id, text) {
  $(id).textContent = text || "";
  $(id).hidden = !text;
}

// ---------------------------------------------------------------------------
// Sign in / sign up
// ---------------------------------------------------------------------------

function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  $("auth-title").textContent = signup ? "Create your account" : "Sign in";
  $("auth-subtitle").textContent = signup
    ? "You'll use this account to sign in to the Screendial app."
    : "Use the same email and password as the Screendial app.";
  $("auth-submit").textContent = signup ? "Create account" : "Sign in";
  $("auth-switch-text").textContent = signup ? "Already have an account?" : "New to Screendial?";
  $("auth-switch").textContent = signup ? "Sign in" : "Create an account";
  $("auth-password").autocomplete = signup ? "new-password" : "current-password";
  message("auth-error");
  message("auth-notice");
}

$("auth-switch").addEventListener("click", () => setMode(mode === "signin" ? "signup" : "signin"));

$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  message("auth-error");
  message("auth-notice");
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  if (!email.includes("@")) return message("auth-error", "Please enter a valid email address.");
  if (mode === "signup" && password.length < 8) return message("auth-error", "Password must be at least 8 characters long.");
  if (!password) return message("auth-error", "Please enter your password.");

  const button = $("auth-submit");
  button.disabled = true;
  try {
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/account/` },
      });
      if (error) throw error;
      if (!data.session) message("auth-notice", "Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    message("auth-error", err.message || "Something went wrong. Please try again.");
  } finally {
    button.disabled = false;
  }
});

$("sign-out").addEventListener("click", () => supabase.auth.signOut());

// ---------------------------------------------------------------------------
// History: one entry per conversation, each with the questions asked and answers given
// ---------------------------------------------------------------------------

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function answersOf(turn) {
  const calls = turn?.layer2?.output?.tool_calls ?? [];
  const texts = calls
    .filter((call) => call.tool === "overlay" || call.tool === "voice")
    .map((call) => call.params?.text)
    .filter((text) => typeof text === "string" && text.trim());
  // the overlay and voice usually say the same thing; show the written one
  return texts[0] ?? "";
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function loadHistory(userId) {
  const list = $("history");
  list.replaceChildren();
  message("history-error");
  $("history-empty").hidden = true;

  // filter by owner explicitly: admins' row-level policy can see everyone's logs
  const { data, error } = await supabase
    .from("harness_logs")
    .select("id, created_at, updated_at, turns")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return message("history-error", "Couldn't load your history. Please refresh to try again.");

  const sessions = (data ?? []).filter((row) => Array.isArray(row.turns) && row.turns.length);
  if (!sessions.length) {
    $("history-empty").hidden = false;
    return;
  }

  for (const session of sessions) {
    const item = el("li", "history-session");
    item.append(el("p", "history-date", dateFormat.format(new Date(session.created_at))));
    for (const turn of session.turns) {
      const prompt = turn?.input?.prompt;
      if (typeof prompt !== "string" || !prompt.trim()) continue;
      const entry = el("div", "history-turn");
      entry.append(el("p", "history-prompt", prompt));
      const answer = answersOf(turn);
      if (answer) entry.append(el("p", "history-answer", answer));
      item.append(entry);
    }
    list.append(item);
  }
}

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

function updateDeleteButton() {
  $("delete-submit").disabled = !($("delete-password").value && $("delete-confirm").value === "DELETE");
}
$("delete-password").addEventListener("input", updateDeleteButton);
$("delete-confirm").addEventListener("input", updateDeleteButton);

$("delete-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  message("delete-error");
  const button = $("delete-submit");
  button.disabled = true;
  button.textContent = "Deleting…";
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Your session has ended. Please sign in again.");
    const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ password: $("delete-password").value, confirm: $("delete-confirm").value }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.deleted) throw new Error(result.error || "Could not delete the account.");
    deleted = true;
    await supabase.auth.signOut({ scope: "local" });
    show("deleted-view");
  } catch (err) {
    message("delete-error", err.message);
    button.textContent = "Delete my account";
    updateDeleteButton();
  }
});

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

let deleted = false;
let shownUser = null;

function render(session) {
  if (deleted) return;
  const user = session?.user ?? null;
  if (!user) {
    shownUser = null;
    $("auth-form").reset();
    show("auth-view");
    return;
  }
  if (shownUser === user.id) return;
  shownUser = user.id;
  $("account-email").textContent = user.email ?? "";
  $("delete-form").reset();
  updateDeleteButton();
  show("account-view");
  loadHistory(user.id);
}

supabase.auth.onAuthStateChange((_event, session) => render(session));
