const form = document.querySelector("#cancel-form");
const nameInput = document.querySelector("#person-name");
const presetInput = document.querySelector("#preset-reason");
const customInput = document.querySelector("#custom-reason");
const notice = document.querySelector("#notice");
const noticeMessage = document.querySelector("#notice-message");
const noticeReason = document.querySelector("#notice-reason");
const actionStatus = document.querySelector("#action-status");

const cancellationText = () => {
  const name = nameInput.value.trim();
  const selectedReason = form.elements.namedItem("reason-choice").value;
  let reason = "";

  if (selectedReason === "preset") {
    reason = presetInput.value;
  } else if (selectedReason === "custom") {
    reason = customInput.value.trim();
  }

  return {
    name,
    reason,
    message: `${name}, I have reviewed the evidence and you're cancelled. This cancellation is effective immediately. No appeals. Case closed!`,
  };
};

const formatCancellation = ({ name, reason, message }) =>
  `${message}${reason ? `\n\nREASON FOR CANCELLATION\n${reason}` : ""}\n\nNo explanation necessary. You know what you did.`;

const syncReasonControls = () => {
  const selectedReason = form.elements.namedItem("reason-choice").value;
  presetInput.hidden = selectedReason !== "preset";
  customInput.hidden = selectedReason !== "custom";
};

form.addEventListener("change", (event) => {
  if (event.target.name === "reason-choice") {
    syncReasonControls();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const data = cancellationText();
  noticeMessage.textContent = data.message;
  noticeReason.hidden = !data.reason;
  noticeReason.replaceChildren();

  if (data.reason) {
    const label = document.createElement("strong");
    label.textContent = "REASON FOR CANCELLATION";
    noticeReason.append(label, document.createTextNode(data.reason));
  }

  notice.hidden = false;
  actionStatus.textContent = "";
  notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

document.querySelector("#copy-message").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(formatCancellation(cancellationText()));
    actionStatus.textContent = "Cancellation copied.";
  } catch {
    actionStatus.textContent = "Couldn't access the clipboard. Please copy the notice manually.";
  }
});

document.querySelector("#copy-link").addEventListener("click", async () => {
  const data = cancellationText();
  const url = new URL(window.location.href);
  url.searchParams.set("name", data.name);
  if (data.reason) url.searchParams.set("reason", data.reason);
  else url.searchParams.delete("reason");

  try {
    await navigator.clipboard.writeText(url.toString());
    actionStatus.textContent = "Share link copied. It contains the entered name and reason.";
  } catch {
    actionStatus.textContent = "Couldn't access the clipboard. Please copy the page URL manually.";
  }
});

document.querySelector("#share").addEventListener("click", async () => {
  const data = cancellationText();
  const url = new URL(window.location.href);
  url.searchParams.set("name", data.name);
  if (data.reason) url.searchParams.set("reason", data.reason);
  else url.searchParams.delete("reason");

  if (!navigator.share) {
    actionStatus.textContent = "Sharing isn't available here. Use “Copy shareable link” instead.";
    return;
  }

  try {
    await navigator.share({
      title: "You're Cancelled",
      text: "A very unofficial cancellation notice:",
      url: url.toString(),
    });
    actionStatus.textContent = "Share sheet opened.";
  } catch (error) {
    if (error.name !== "AbortError") {
      actionStatus.textContent = "Couldn't open the share sheet. Try copying the shareable link.";
    }
  }
});

const sharedName = new URLSearchParams(window.location.search).get("name");
const sharedReason = new URLSearchParams(window.location.search).get("reason");

if (sharedName) {
  nameInput.value = sharedName.slice(0, 60);
  if (sharedReason) {
    const preset = Array.from(presetInput.options).find((option) => option.value === sharedReason);
    if (preset) {
      presetInput.value = preset.value;
    } else {
      form.elements.namedItem("reason-choice").value = "custom";
      customInput.value = sharedReason.slice(0, 120);
      syncReasonControls();
    }
  } else {
    form.elements.namedItem("reason-choice").value = "none";
    syncReasonControls();
  }
  form.requestSubmit();
}
