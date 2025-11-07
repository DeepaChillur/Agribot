import os
from flask import Flask, request, jsonify, render_template
import google.generativeai as genai
from PIL import Image
import io

app = Flask(__name__)

# ====== 🔑 GEMINI API KEY CONFIGURATION ======
# Paste your Gemini API key here 👇
GEMINI_API_KEY="AIzaSyADzNnrQo5fy77CHOTaj4rn7z3Qazlr6FA"

genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")


# ========== FUNCTION TO CHECK AGRICULTURE RELEVANCE ==========
def is_agriculture_query(text):
    keywords = [
        "crop", "soil", "fertilizer", "pesticide", "harvest", "irrigation",
        "farming", "seed", "plant", "weather", "agriculture", "farmer", "yield",
        "organic", "insect", "climate", "plough", "sowing"
    ]
    return any(word.lower() in text.lower() for word in keywords)


# ========== ROUTES ==========
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/ask', methods=['POST'])
def ask():
    text = request.form.get("query", "")
    image = request.files.get("image")

    if text and not is_agriculture_query(text):
        return jsonify({
            "response": "🌱 Please ask queries related to agriculture only.\n\nExample: How to improve soil fertility?"
        })

    try:
        if image:
            img = Image.open(io.BytesIO(image.read()))
            prompt = text if text else "Analyze this agricultural image and explain what it shows."
            response = model.generate_content([prompt, img])
        else:
            response = model.generate_content(text)

        reply = response.text.strip().replace("•", "\n•")
        return jsonify({"response": reply})

    except Exception as e:
        return jsonify({"response": f"⚠️ Error: {str(e)}"})


if __name__ == "__main__":
    app.run(debug=True)