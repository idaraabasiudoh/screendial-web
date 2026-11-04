// Delete account: a code emailed to this account comes first, then the code and DELETE together.
// The delete-account edge function checks the code, so it works for password and Google accounts.
import { $, callFunction, message, requireUser, sendCode, supabase } from "/assets/js/account-common.js";

let user = null;
let deleted = false;

function show(view) {
  for (const id of ["start-view", "confirm-view", "deleted-view"]) $(id).hidden = id !== view;
}

function updateDeleteButton() {
  $("delete-submit").disabled = !($("delete-code").value.trim() && $("delete-confirm").value === "DELETE");
}
$("delete-code").addEventListener("input", updateDeleteButton);
$("delete-confirm").addEventListener("input", updateDeleteButton);

$("send-code").addEventListener("click", async () => {
  message("start-error");
  $("send-code").disabled = true;
  try {
    await sendCode(user.email);
    $("code-sent").textContent = `We sent a code to ${user.email}.`;
    show("confirm-view");
  } catch (err) {
    message("start-error", err.message);
  } finally {
    $("send-code").disabled = false;
  }
});

$("delete-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  message("delete-error");
  const button = $("delete-submit");
  button.disabled = true;
  button.textContent = "Deleting…";
  try {
    const { ok, result } = await callFunction("delete-account", { code: $("delete-code").value.trim(), confirm: $("delete-confirm").value });
    if (!ok || !result.deleted) throw new Error(result.error || "Could not delete the account.");
    deleted = true;
    show("deleted-view");
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    if (deleted) return;
    message("delete-error", err.message);
    button.textContent = "Delete my account";
    updateDeleteButton();
  }
});

requireUser((signedIn) => {
  user = signedIn;
  show("start-view");
});
