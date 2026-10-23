const form = document.querySelector("#cancel-form");
const nameInput = document.querySelector("#person-name");
const presetInput = document.querySelector("#preset-reason");
const customInput = document.querySelector("#custom-reason");
const reactionPicker = document.querySelector("#reaction-picker");
const reactionButtons = Array.from(document.querySelectorAll(".reaction-choice"));
const reactionStatus = document.querySelector("#reaction-status");
const notice = document.querySelector("#notice");
const noticeMessage = document.querySelector("#notice-message");
const noticeReason = document.querySelector("#notice-reason");
const actionStatus = document.querySelector("#action-status");
const hero = document.querySelector(".hero");
const generator = document.querySelector(".generator");
const caseLabel = document.querySelector(".case-label");

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
    reactions: reason
      ? reactionButtons
          .filter((button) => button.getAttribute("aria-pressed") === "true")
          .map((button) => button.dataset.reaction)
      : [],
    message: `${name}, I have reviewed the evidence and you're cancelled. This cancellation is effective immediately. No appeals. Case closed!`,
  };
};

let currentCancellation;

const formatCancellation = ({ reason, reactions, message }) => {
  const reactionText = reactions?.length ? ` ${reactions.join(" ")}` : "";
  return `${message}${reason ? `\n\nREASON FOR CANCELLATION\n${reason}${reactionText}` : ""}\n\nNo explanation necessary. You know what you did.`;
};

const createShareUrl = ({ name, reason, reactions }) => {
  const url = new URL(window.location.href);
  url.searchParams.set("name", name);
  if (reason) url.searchParams.set("reason", reason);
  else url.searchParams.delete("reason");
  url.searchParams.delete("reaction");
  reactions?.forEach((reaction) => url.searchParams.append("reaction", reaction));
  return url;
};

const renderCancellation = (data, { isShared = false } = {}) => {
  currentCancellation = data;
  noticeMessage.textContent = data.message;
  noticeReason.hidden = !data.reason;
  noticeReason.replaceChildren();

  if (data.reason) {
    const label = document.createElement("strong");
    label.textContent = "REASON FOR CANCELLATION";
    noticeReason.append(label, document.createTextNode(data.reason));

    if (data.reactions?.length) {
      const reactionList = document.createElement("span");
      reactionList.className = "notice-reactions";
      reactionList.setAttribute("aria-label", "Selected emojis and stickers");

      for (const reaction of data.reactions) {
        const item = document.createElement("span");
        item.className = "notice-reaction";
        item.setAttribute("aria-hidden", "true");
        item.textContent = reaction;
        reactionList.append(item);
      }

      noticeReason.append(reactionList);
    }
  }

  if (isShared) {
    hero.hidden = true;
    generator.hidden = true;
    caseLabel.textContent = "SHARED NOTICE | READ ONLY";
  }

  notice.hidden = false;
  actionStatus.textContent = "";
  if (!isShared) {
    notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
};

const syncReasonControls = () => {
  const selectedReason = form.elements.namedItem("reason-choice").value;
  presetInput.hidden = selectedReason !== "preset";
  customInput.hidden = selectedReason !== "custom";
  const hasReason = selectedReason === "preset" ||
    (selectedReason === "custom" && customInput.value.trim().length > 0);
  reactionPicker.hidden = !hasReason;
  reactionButtons.forEach((button) => {
    button.disabled = !hasReason;
    if (!hasReason) {
      button.setAttribute("aria-pressed", "false");
    }
  });
  if (!hasReason) reactionStatus.textContent = "";
};

syncReasonControls();

form.addEventListener("change", (event) => {
  if (event.target.name === "reason-choice") {
    syncReasonControls();
  }
});

customInput.addEventListener("input", syncReasonControls);

reactionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const isSelected = button.getAttribute("aria-pressed") === "true";
    const selectedCount = reactionButtons.filter(
      (item) => item.getAttribute("aria-pressed") === "true",
    ).length;

    if (!isSelected && selectedCount >= 3) {
      reactionStatus.textContent = "Choose up to 3 reactions.";
      return;
    }

    button.setAttribute("aria-pressed", String(!isSelected));
    reactionStatus.textContent = "";
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  renderCancellation(cancellationText());
});

document.querySelector("#copy-message").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(formatCancellation(currentCancellation));
    actionStatus.textContent = "Cancellation copied.";
  } catch {
    actionStatus.textContent = "Couldn't access the clipboard. Please copy the notice manually.";
  }
});

document.querySelector("#copy-link").addEventListener("click", async () => {
  const data = currentCancellation;
  const url = createShareUrl(data);

  try {
    await navigator.clipboard.writeText(url.toString());
    actionStatus.textContent = "Share link copied. It contains the entered name and reason.";
  } catch {
    actionStatus.textContent = "Couldn't access the clipboard. Please copy the page URL manually.";
  }
});

document.querySelector("#share").addEventListener("click", async () => {
  const data = currentCancellation;
  const url = createShareUrl(data);

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
const allowedReactions = new Set(reactionButtons.map((button) => button.dataset.reaction));
const sharedReactions = new URLSearchParams(window.location.search)
  .getAll("reaction")
  .filter((reaction) => allowedReactions.has(reaction))
  .slice(0, 3);
const recipientName = sharedName?.trim().slice(0, 60);

if (recipientName) {
  const reason = sharedReason?.trim().slice(0, 120) ?? "";
  renderCancellation(
    {
      name: recipientName,
      reason,
      reactions: reason ? sharedReactions : [],
      message: `${recipientName}, I have reviewed the evidence and you're cancelled. This cancellation is effective immediately. No appeals. Case closed!`,
    },
    { isShared: true },
  );
}
