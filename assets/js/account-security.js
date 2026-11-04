// Sign-in and security: change email or password, always in the same order. First the user proves
// it's them with a code emailed to their current address, and only then sees the new-value form.
// Verifying the code also starts a fresh session, which Supabase's secure password change accepts.
// Google-only accounts have neither to change; their address belongs to Google.
import { $, message, requireUser, sendCode, supabase } from "/assets/js/account-common.js";

const VIEWS = ["menu-view", "code-view", "email-view", "password-view"];
let user = null;
let action = null;

function show(view) {
  for (const id of VIEWS) $(id).hidden = id !== view;
}

function backToMenu(notice) {
  action = null;
  for (const id of ["code-form", "email-form", "password-form"]) $(id).reset();
  $("current-email").textContent = user.email ?? "";
  message("menu-notice", notice);
  show("menu-view");
}

async function startChange(next) {
  action = next;
  message("menu-notice");
  message("code-error");
  try {
    await sendCode(user.email);
    $("code-sent").textContent = `We sent a code to ${user.email}.`;
    show("code-view");
  } catch (err) {
    message("menu-notice", err.message);
  }
}

$("change-email").addEventListener("click", () => startChange("email"));
$("change-password").addEventListener("click", () => startChange("password"));
$("code-cancel").addEventListener("click", () => backToMenu());
$("code-resend").addEventListener("click", async () => {
  message("code-error");
  try {
    await sendCode(user.email);
    $("code-sent").textContent = `We sent a new code to ${user.email}.`;
  } catch (err) {
    message("code-error", err.message);
  }
});

$("code-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  message("code-error");
  const token = $("code").value.trim();
  if (!token) return message("code-error", "Enter the code we emailed you.");
  $("code-submit").disabled = true;
  const { error } = await supabase.auth.verifyOtp({ email: user.email, token, type: "email" });
  $("code-submit").disabled = false;
  if (error) return message("code-error", "That code is wrong or has expired.");
  show(action === "email" ? "email-view" : "password-view");
});

$("email-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  message("email-error");
  const email = $("new-email").value.trim();
  if (!email.includes("@")) return message("email-error", "Please enter a valid email address.");
  $("email-submit").disabled = true;
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${location.origin}/account/` });
  $("email-submit").disabled = false;
  if (error) return message("email-error", error.message);
  backToMenu("Almost done: open the confirmation links we sent to your current and new addresses.");
});

$("password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  message("password-error");
  const password = $("new-password").value;
  if (password.length < 8) return message("password-error", "Password must be at least 8 characters long.");
  $("password-submit").disabled = true;
  const { error } = await supabase.auth.updateUser({ password });
  $("password-submit").disabled = false;
  if (error) return message("password-error", error.message);
  backToMenu("Your password has been changed.");
});

requireUser((signedIn) => {
  user = signedIn;
  const hasPassword = (user.identities ?? []).some((identity) => identity.provider === "email");
  $("google-note").hidden = hasPassword;
  $("change-buttons").hidden = !hasPassword;
  backToMenu();
});
