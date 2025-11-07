const form = document.getElementById("query-form");
const chatBox = document.getElementById("chat-box");
const voiceBtn = document.getElementById("voice-btn");
const userInput = document.getElementById("user-input");

let recognizing = false;
let recognition;

// ✅ Voice Recognition Setup
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-IN"; // Indian English

  recognition.onstart = () => {
    recognizing = true;
    voiceBtn.style.background = "#ffcc00";
    voiceBtn.innerText = "🎧";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
  };

  recognition.onend = () => {
    recognizing = false;
    voiceBtn.style.background = "#00ff99";
    voiceBtn.innerText = "🎙️";
  };

  voiceBtn.addEventListener("click", () => {
    if (recognizing) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
} else {
  voiceBtn.disabled = true;
  voiceBtn.title = "Speech recognition not supported in this browser";
}

// ✅ Chat Functionality
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  const imageFile = document.getElementById("image-file").files[0];
  if (!text && !imageFile) return;

  addMessage("user", text || "[📷 Image sent]");

  const formData = new FormData();
  formData.append("query", text);
  if (imageFile) formData.append("image", imageFile);

  const typingMsg = addMessage("bot", "Typing...");
  typingMsg.classList.add("typing");

  const res = await fetch("/ask", { method: "POST", body: formData });
  const data = await res.json();

  chatBox.removeChild(typingMsg);
  typeMessage("bot", formatResponse(data.response));

  form.reset();
});

function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerHTML = `<b>${sender === "user" ? "👩‍🌾 You:" : "🤖 Bot:"}</b> ${text}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function formatResponse(response) {
  return response.replace(/\n/g, "<br>• ");
}

function typeMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  chatBox.appendChild(msg);

  let i = 0;
  const interval = setInterval(() => {
    msg.innerHTML = `<b>${sender === "user" ? "👩‍🌾 You:" : "🤖 Bot:"}</b> ${text.substring(0, i)}|`;
    i++;
    if (i > text.length) {
      clearInterval(interval);
      msg.innerHTML = `<b>${sender === "user" ? "👩‍🌾 You:" : "🤖 Bot:"}</b> ${text}`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 20);
}