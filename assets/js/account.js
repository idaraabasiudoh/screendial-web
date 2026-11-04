// Main account page: sign in or up (also for the app), plan and history. Subpages hold the rest:
// account-security.js (email and password) and account-delete.js.
import { $, callFunction, message, supabase } from "/assets/js/account-common.js";

// A password reset link lands here with this in the URL; supabase-js clears it once it has read it.
let recovering = location.hash.includes("type=recovery");

let mode = "signin";

function show(view) {
  $("loading").hidden = true;
  for (const id of ["auth-view", "reset-view", "app-view", "account-view"]) $(id).hidden = id !== view;
}

// ---------------------------------------------------------------------------
// Sign in / sign up
// ---------------------------------------------------------------------------

// The Screendial app signs in here: it opens /account/?app=<challenge>, where the challenge is
// base64url(sha256(verifier)) and the verifier stays in the app. Once signed in, "Open Screendial"
// asks the app-auth function for a one-time code bound to that challenge and hands it to the app.
const APP_CHALLENGE = (() => {
  const challenge = new URLSearchParams(location.search).get("app");
  return challenge && /^[A-Za-z0-9_-]{43}$/.test(challenge) ? challenge : null;
})();

function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  $("auth-title").textContent = signup ? "Create your account" : APP_CHALLENGE ? "Sign in to Screendial" : "Sign in";
  $("auth-subtitle").textContent = signup
    ? "You'll use this account to sign in to the Screendial app."
    : "Sign in with Google, or with your email and password.";
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
        // keeps ?app=, so confirming the email continues the app sign-in
        options: { emailRedirectTo: `${location.origin}/account/${location.search}` },
      });
      if (error) throw error;
      if (!data.session) {
        message("auth-notice", "Check your email to confirm your account, then sign in.");
        $("auth-resend").hidden = false;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    if (err.code === "email_not_confirmed") $("auth-resend").hidden = false;
    message("auth-error", err.message || "Something went wrong. Please try again.");
  } finally {
    button.disabled = false;
  }
});

const returnUrl = `${location.origin}/account/${location.search}`;

async function resendConfirmation(email, showResult) {
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: returnUrl } });
  showResult(error ? error.message : "Confirmation email sent. Check your inbox.");
}

$("auth-resend").addEventListener("click", () => {
  message("auth-error");
  resendConfirmation($("auth-email").value.trim(), (text) => message("auth-notice", text));
});

$("auth-forgot").addEventListener("click", async () => {
  message("auth-error");
  message("auth-notice");
  const email = $("auth-email").value.trim();
  if (!email.includes("@")) return message("auth-error", "Enter your email address above first.");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: returnUrl });
  if (error) return message("auth-error", error.message);
  message("auth-notice", "If that address has an account, a password reset link is on its way.");
});

$("reset-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  message("reset-error");
  const password = $("reset-password").value;
  if (password.length < 8) return message("reset-error", "Password must be at least 8 characters long.");
  $("reset-submit").disabled = true;
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase.auth.updateUser({ password });
  $("reset-submit").disabled = false;
  if (error) return message("reset-error", error.message);
  recovering = false;
  shownUser = null;
  render(session);
});

$("auth-google").addEventListener("click", async () => {
  message("auth-error");
  // Google sends the browser back to this same URL, ?app= included.
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${location.origin}/account/${location.search}` },
  });
  if (error) message("auth-error", error.message || "Could not start Google sign-in.");
});

$("sign-out").addEventListener("click", () => supabase.auth.signOut());

// ---------------------------------------------------------------------------
// Hand this sign-in to the Screendial app
// ---------------------------------------------------------------------------

$("app-continue").addEventListener("click", async () => {
  message("app-error");
  const button = $("app-continue");
  button.disabled = true;
  try {
    const { ok, result } = await callFunction("app-auth", { action: "issue", challenge: APP_CHALLENGE });
    if (!ok || !result.code) throw new Error(result.error || "Could not sign in to the app.");
    $("app-code").textContent = result.code;
    $("app-done").hidden = false;
    location.href = `screendial://auth/callback?code=${encodeURIComponent(result.code)}`;
  } catch (err) {
    message("app-error", err.message);
  } finally {
    button.disabled = false;
  }
});

$("app-copy").addEventListener("click", () => navigator.clipboard?.writeText($("app-code").textContent));
$("app-switch").addEventListener("click", () => supabase.auth.signOut());

// ---------------------------------------------------------------------------
// History export: download every conversation as JSON or plain text
// ---------------------------------------------------------------------------

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function answerOf(turn) {
  const calls = turn?.layer2?.output?.tool_calls ?? [];
  const texts = calls
    .filter((call) => call.tool === "overlay" || call.tool === "voice")
    .map((call) => call.params?.text)
    .filter((text) => typeof text === "string" && text.trim());
  // the overlay and voice usually say the same thing; keep the written one
  return texts[0] ?? "";
}

/** Every conversation the user owns, oldest first, as plain questions and answers. */
async function fetchHistory(userId) {
  const pageSize = 500;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    // filter by owner explicitly: admins' row-level policy can see everyone's logs
    const { data, error } = await supabase
      .from("harness_logs")
      .select("created_at, turns")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows
    .map((row) => ({
      started_at: row.created_at,
      messages: (Array.isArray(row.turns) ? row.turns : [])
        .filter((turn) => typeof turn?.input?.prompt === "string" && turn.input.prompt.trim())
        .map((turn) => ({ asked_at: turn.startedAt ?? null, question: turn.input.prompt, answer: answerOf(turn) })),
    }))
    .filter((conversation) => conversation.messages.length);
}

function asText(conversations) {
  return conversations
    .map((conversation) => {
      const lines = [`Conversation, ${dateFormat.format(new Date(conversation.started_at))}`, ""];
      for (const { question, answer } of conversation.messages) {
        lines.push(`You: ${question}`);
        if (answer) lines.push(`Screendial: ${answer}`);
        lines.push("");
      }
      return lines.join("\n");
    })
    .join("\n");
}

function download(filename, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportHistory(format) {
  message("history-error");
  const buttons = [$("export-json"), $("export-text")];
  buttons.forEach((button) => (button.disabled = true));
  try {
    const conversations = await fetchHistory(shownUser);
    if (!conversations.length) return message("history-error", "You don't have any history to export yet.");
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      const body = { exported_at: new Date().toISOString(), conversations };
      download(`screendial-history-${stamp}.json`, "application/json", JSON.stringify(body, null, 2));
    } else {
      download(`screendial-history-${stamp}.txt`, "text/plain", asText(conversations));
    }
  } catch {
    message("history-error", "Couldn't export your history. Please try again.");
  } finally {
    buttons.forEach((button) => (button.disabled = false));
  }
}

$("export-json").addEventListener("click", () => exportHistory("json"));
$("export-text").addEventListener("click", () => exportHistory("text"));

// ---------------------------------------------------------------------------
// Plan: this month's usage, and Stripe Checkout / customer portal through the billing function
// ---------------------------------------------------------------------------

const longDate = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

async function loadPlan() {
  message("plan-error");
  const { data, error } = await supabase.rpc("get_my_usage");
  const plan = data?.[0];
  if (error || !plan) {
    $("plan-summary").textContent = "";
    return message("plan-error", "Couldn't load your plan. Please refresh the page.");
  }

  // Organization members (e.g. @gropad.com) are unlimited and have nothing to buy or manage.
  if (plan.organization) {
    $("plan-summary").textContent = `You're covered by your organization, ${plan.organization}. Screendial is unlimited for you.`;
    $("plan-usage").textContent = `${plan.used_this_month} questions asked this month.`;
    $("plan-usage").hidden = false;
    for (const id of ["plan-upgrade", "plan-student", "plan-manage"]) $(id).hidden = true;
    return;
  }

  const subscribed = plan.status === "active" || plan.status === "trialing";
  let summary = `You're on the ${plan.plan_name} plan.`;
  if (subscribed && plan.current_period_end) {
    const date = longDate.format(new Date(plan.current_period_end));
    summary += plan.cancel_at_period_end ? ` It ends on ${date}.` : ` It renews on ${date}.`;
  } else if (plan.status === "past_due" || plan.status === "unpaid") {
    summary += " Your last payment didn't go through; update your payment method to keep Pro.";
  }
  $("plan-summary").textContent = summary;
  $("plan-usage").textContent = `${plan.used_this_month} of ${plan.monthly_queries} questions used this month. The count resets on the 1st.`;
  $("plan-usage").hidden = false;

  // subscribing needs a confirmed email address; the billing function checks again
  $("plan-upgrade").hidden = subscribed || !emailConfirmed;
  // only school email addresses can buy the student plan; the billing function checks again
  $("plan-student").hidden = subscribed || !plan.student_eligible || !emailConfirmed;
  // anyone who has been through checkout has a Stripe customer, and the portal shows invoices
  $("plan-manage").hidden = !plan.status;
  // Receipts follow an email change; a failure here shouldn't get in the way of the page.
  if (plan.status) callFunction("billing", { action: "sync_email" }).catch(() => {});
}

async function openBilling(action, plan) {
  message("plan-error");
  const buttons = [$("plan-upgrade"), $("plan-student"), $("plan-manage")];
  buttons.forEach((button) => (button.disabled = true));
  try {
    const { ok, result } = await callFunction("billing", { action, plan });
    if (!ok || !result.url) throw new Error(result.error || "Couldn't open billing. Please try again.");
    location.assign(result.url);
  } catch (err) {
    message("plan-error", err.message);
    buttons.forEach((button) => (button.disabled = false));
  }
}

$("plan-upgrade").addEventListener("click", () => openBilling("checkout", "pro"));
$("plan-student").addEventListener("click", () => openBilling("checkout", "student"));
$("plan-manage").addEventListener("click", () => openBilling("portal"));

// Back from Stripe Checkout: say what happened, then drop the query so a refresh doesn't repeat it.
const checkout = new URLSearchParams(location.search).get("checkout");
if (checkout === "success") {
  message("plan-notice", "Thanks for subscribing! Your plan updates within a minute.");
  // the webhook usually lands within seconds; show the new plan without a manual refresh
  setTimeout(() => shownUser && loadPlan(), 5000);
}
if (checkout === "cancelled") message("plan-notice", "Checkout was cancelled. You haven't been charged.");
if (checkout) history.replaceState(null, "", location.pathname);

$("verify-resend").addEventListener("click", () => {
  resendConfirmation($("account-email").textContent, (text) => ($("verify-resend").textContent = text));
});

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

let shownUser = null;
let emailConfirmed = false;

function render(session) {
  const user = session?.user ?? null;
  if (!user) {
    shownUser = null;
    $("auth-form").reset();
    show("auth-view");
    return;
  }
  if (recovering) return show("reset-view");
  if (shownUser === user.id) return;
  shownUser = user.id;
  emailConfirmed = Boolean(user.email_confirmed_at);
  if (APP_CHALLENGE) {
    $("app-unconfirmed").hidden = emailConfirmed;
    $("app-continue").disabled = !emailConfirmed;
    $("app-email").textContent = `Signed in as ${user.email ?? "your account"}`;
    $("app-done").hidden = true;
    message("app-error");
    show("app-view");
    return;
  }
  $("account-email").textContent = user.email ?? "";
  $("verify-banner").hidden = emailConfirmed;
  show("account-view");
  loadPlan();
}

if (new URLSearchParams(location.search).get("mode") === "signup") setMode("signup");
else if (APP_CHALLENGE) setMode("signin");

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") recovering = true;
  render(session);
});
