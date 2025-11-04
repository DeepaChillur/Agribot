document.getElementById("send-btn").addEventListener("click", sendMessage);
document
  .getElementById("user-input")
  .addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

const imageInput = document.getElementById("image-file");
const imagePreview = document.getElementById("image-preview");
let imageBase64 = null;

// Preview image
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      imageBase64 = event.target.result;
      imagePreview.innerHTML = `<img src="${imageBase64}" alt="Uploaded image">`;
    };
    reader.readAsDataURL(file);
  } else {
    imageBase64 = null;
    imagePreview.innerHTML = "";
  }
});

async function sendMessage() {
  const userInput = document.getElementById("user-input").value.trim();
  if (!userInput && !imageBase64) return;

  const chatBox = document.getElementById("chat-box");

  // Show user message
  if (userInput)
    chatBox.innerHTML += `<div class="message user">👩‍🌾 You: ${userInput}</div>`;
  if (imageBase64)
    chatBox.innerHTML += `<div class="message user"><img src="${imageBase64}" width="150"></div>`;
  chatBox.scrollTop = chatBox.scrollHeight;

  // Show loading text
  const loadingMsg = document.createElement("div");
  loadingMsg.classList.add("message", "bot");
  loadingMsg.textContent = "🤖 AgriBot is analyzing...";
  chatBox.appendChild(loadingMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch("/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg: userInput, image: imageBase64 }),
    });

    const data = await res.json();
    const botReply = formatResponse(data.reply);

    loadingMsg.remove();
    chatBox.innerHTML += `<div class="message bot">🤖 AgriBot:<br>${botReply}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    console.error(err);
    loadingMsg.textContent = "⚠️ Error: Couldn't connect to server.";
  }

  // Reset inputs
  document.getElementById("user-input").value = "";
  imageInput.value = "";
  imagePreview.innerHTML = "";
  imageBase64 = null;
}

// Format Gemini response as bullet points
function formatResponse(text) {
  const lines = text
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      if (/^[-*•]\s/.test(l)) return `<li>${l.replace(/^[-*•]\s*/, "")}</li>`;
      if (/^\d+\.\s/.test(l)) return `<li>${l.replace(/^\d+\.\s*/, "")}</li>`;
      return `<li>${l}</li>`;
    })
    .join("");
  return `<ul>${lines}</ul>`;
}