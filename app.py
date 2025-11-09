import os
import io
from flask import Flask, render_template, request, jsonify
from PIL import Image
import google.generativeai as genai  # pip package: google-generativeai
from dotenv import load_dotenv

# Load .env if present (recommended)
load_dotenv()

app = Flask(__name__)

# ====== GEMINI API KEY ======
# Option A: Put key in environment (recommended)
#   export GEMINI_API_KEY="AIzaSy...."
# Option B: Or paste directly below (not recommended for public repos)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY","AIzaSyADzNnrQo5fy77CHOTaj4rn7z3Qazlr6FA")

if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
    raise ValueError(
        "⚠️ GEMINI_API_KEY not found. "
        "Set environment variable GEMINI_API_KEY or edit app.py to add your key."
    )

# Configure genai
genai.configure(api_key=GEMINI_API_KEY)

# Choose an image-capable Gemini model; change if you have other model
model = genai.GenerativeModel("gemini-2.5-flash")

# ========== Chat memory ==========
# We'll store a short sequence of exchanges (keep it small to avoid large token use)
chat_history = []  # list of dicts: {"role":"user"/"model","parts":[...strings or images...]}

# Helper: keep memory short (last N messages)
MAX_HISTORY_ITEMS = 8


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/get_response", methods=["POST"])
def get_response():
    global chat_history

    user_input = request.form.get("user_input", "").strip()
    image_file = request.files.get("image")

    # validate
    if not user_input and not image_file:
        return jsonify({"response": "Please provide a question or an image."})

    # System prompt enforces agricultural-only and step format using a delimiter
    system_prompt = (
        "You are a helpful agricultural assistant. "
        "Answer ONLY agricultural-related queries about crops, soil, fertilizers, irrigation, pests, "
        "livestock agricultural care, or closely related farm practices. "
        "If the user asks anything unrelated to agriculture, reply exactly: "
        "'Please ask only agricultural-related queries 🌾'.\n\n"
        "When answering, respond as short, practical steps. "
        "Separate each step with the token: |||STEP||| (three pipes, STEP, three pipes). "
        "Steps should be concise (one or two short sentences each). "
        "Do NOT include other commentary. Keep answers relevant to the question and to the farmer audience."
    )

    # Build message sequence for Gemini
    # Start with system prompt then previous history then this user message
    contents = []
    # Attach system prompt first as a user-provided instruction (we put system text inside user part to be safe)
    contents.append({"role": "user", "parts": [system_prompt]})

    # Append limited chat history for context
    if chat_history:
        for item in chat_history[-MAX_HISTORY_ITEMS:]:
            # item is already in correct shape
            contents.append(item)

    # Current user message: if image present, include image object first in parts
    if image_file:
        try:
            image_bytes = image_file.read()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            return jsonify({"response": f"Error reading uploaded image: {str(e)}"})

        # Put image and text in one user part
        user_part = {"role": "user", "parts": [image, user_input or ""]}
        contents.append(user_part)
    else:
        contents.append({"role": "user", "parts": [user_input]})

    # Call Gemini model
    try:
        response = model.generate_content(contents)
    except Exception as e:
        # Return a helpful error message
        return jsonify({"response": f"Error from model: {str(e)}"})

    # Extract text
    bot_reply = ""
    if hasattr(response, "text"):
        bot_reply = response.text.strip()
    else:
        # fallback
        bot_reply = str(response).strip()

    # If returned unrelated reply, keep it as-is (system prompt asked to return exact phrase)
    # Save to history: store just the text (and user text)
    chat_history.append({"role": "user", "parts": [user_input]})
    chat_history.append({"role": "model", "parts": [bot_reply]})

    # Trim history
    if len(chat_history) > 2 * MAX_HISTORY_ITEMS:
        chat_history = chat_history[-2 * MAX_HISTORY_ITEMS :]

    return jsonify({"response": bot_reply})


if __name__ == "__main__":
    # For production use a proper WSGI server; debug=True is for local testing only
    app.run(debug=True, port=5000)