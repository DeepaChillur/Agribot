from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
from PIL import Image
import io
import base64

app = Flask(__name__)

# ✅ Paste your Gemini API key here
genai.configure(api_key="AIzaSyADzNnrQo5fy77CHOTaj4rn7z3Qazlr6FA")

# ✅ Gemini Vision model (for text + images)
model = genai.GenerativeModel("models/gemini-2.5-flash")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/get", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("msg", "")
    image_data = data.get("image", None)

    contents = [user_input]

    # If image is sent, decode and include it
    if image_data:
        try:
            image_bytes = base64.b64decode(image_data.split(",")[1])
            image = Image.open(io.BytesIO(image_bytes))
            contents.append(image)
        except Exception as e:
            print("Image error:", e)

    try:
        response = model.generate_content(contents)
        bot_reply = response.text
    except Exception as e:
        print("Error:", e)
        bot_reply = "⚠️ Sorry, I couldn't process your request."

    return jsonify({"reply": bot_reply})

if __name__ == "__main__":
    app.run(debug=True)