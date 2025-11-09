// Elements
const form = document.getElementById("query-form");
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const imageInput = document.getElementById("image-file");
const voiceBtn = document.getElementById("voice-btn");

// Setup speech recognition (voice input)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = "en-IN";

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    userInput.value = text;
  };

  recognition.onerror = (e) => {
    console.warn("Speech recognition error:", e.error);
  };
} else {
  voiceBtn.disabled = true;
  voiceBtn.title = "Speech not supported";
}

// Voice button
voiceBtn.addEventListener("click", () => {
  if (!recognition) return;
  try {
    recognition.start();
  } catch (e) {
    // ignore already-started
  }
});

// Helper to add a message
function addMessage(contentHTML, sender = "bot") {
  const wrapper = document.createElement("div");
  wrapper.classList.add("message", sender === "user" ? "user-message" : "bot-message");

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.innerHTML = `
    <div class="from">${sender === "user" ? "👩‍🌾 You" : "🤖 Bot"}</div>
    <div class="content">${contentHTML}</div>
  `;
  wrapper.appendChild(bubble);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
  return wrapper;
}

// Typing placeholder
function addTypingPlaceholder() {
  const ph = addMessage("Typing...", "bot");
  ph.querySelector(".content").classList.add("typing");
  return ph;
}

// Play text using browser TTS
function speakText(text, lang = "en-IN") {
  if (!("speechSynthesis" in window)) return;
  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = lang;
  ut.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(ut);
}

// Display steps sequentially (auto reveal) with read button per step
async function displayStepsSequentially(rawText) {
  // split by delimiter
  const steps = rawText.split("|||STEP|||").map(s => s.trim()).filter(Boolean);

  // If no delimiter, show as single bubble (simple)
  if (steps.length === 0) {
    addMessage(escapeHtml(rawText), "bot");
    return;
  }

  // Build ordered list container then append step items progressively
  const containerWrapper = document.createElement("div");
  containerWrapper.classList.add("message", "bot-message");
  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.innerHTML = `<div class="from">🤖 Bot</div>`;
  const ol = document.createElement("ol");
  ol.style.marginTop = "6px";
  bubble.appendChild(ol);

  // Controls row
  const controls = document.createElement("div");
  controls.style.marginTop = "8px";
  // "Show all" button
  const showAllBtn = document.createElement("button");
  showAllBtn.textContent = "Show all";
  showAllBtn.style.marginRight = "8px";
  showAllBtn.onclick = () => {
    // show remaining steps immediately
    for (let i = currentIndex; i < steps.length; ++i) {
      appendStep(i);
    }
    currentIndex = steps.length;
    showAllBtn.disabled = true;
    nextBtn.disabled = true;
  };
  // "Next step" button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next step ▶";
  nextBtn.onclick = () => {
    if (currentIndex < steps.length) {
      appendStep(currentIndex);
      currentIndex++;
      if (currentIndex >= steps.length) {
        nextBtn.disabled = true;
        nextBtn.textContent = "Done";
        showAllBtn.disabled = true;
      }
    }
  };

  controls.appendChild(nextBtn);
  controls.appendChild(showAllBtn);
  bubble.appendChild(controls);

  containerWrapper.appendChild(bubble);
  chatBox.appendChild(containerWrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  let currentIndex = 0;

  function appendStep(i) {
    const li = document.createElement("li");
    li.innerHTML = escapeHtml(steps[i]);
    // read button
    const readBtn = document.createElement("button");
    readBtn.textContent = "🔊";
    readBtn.style.marginLeft = "10px";
    readBtn.onclick = () => speakText(steps[i]);
    // attach read button to li
    const span = document.createElement("span");
    span.style.marginLeft = "8px";
    span.appendChild(readBtn);
    li.appendChild(span);
    ol.appendChild(li);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // show first step immediately (if exists)
  if (steps.length > 0) {
    appendStep(0);
    currentIndex = 1;
    if (currentIndex >= steps.length) {
      nextBtn.disabled = true;
      nextBtn.textContent = "Done";
      showAllBtn.disabled = true;
    }
  }

  // auto reveal every 2s if user doesn't press next (optional)
  const autoIntervalMs = 2500;
  const interval = setInterval(() => {
    if (currentIndex < steps.length) {
      appendStep(currentIndex);
      currentIndex++;
    } else {
      clearInterval(interval);
      nextBtn.disabled = true;
      showAllBtn.disabled = true;
    }
  }, autoIntervalMs);
}

// Basic escaping
function escapeHtml(unsafe) {
  return (unsafe + "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}

// Submit handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  const file = imageInput.files.length ? imageInput.files[0] : null;

  if (!text && !file) return;

  // show user message
  addMessage(escapeHtml(text || "[image]"), "user");
  userInput.value = "";
  imageInput.value = "";

  // typing placeholder
  const typing = addTypingPlaceholder();

  // build form data
  const formData = new FormData();
  formData.append("user_input", text);
  if (file) formData.append("image", file);

  try {
    const resp = await fetch("/get_response", { method: "POST", body: formData });
    const data = await resp.json();
    // remove typing
    if (typing && typing.parentNode) typing.parentNode.removeChild(typing);

    // display steps sequentially
    await displayStepsSequentially(data.response);
  } catch (err) {
    if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
    addMessage("⚠️ Error: could not get response. Try again.", "bot");
    console.error(err);
  }
});