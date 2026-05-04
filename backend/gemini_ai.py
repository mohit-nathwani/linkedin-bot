import base64
from typing import Dict, Any
import google.generativeai as genai

def detect_reply_from_screenshot(screenshot_bytes: bytes, api_key: str) -> Dict[str, Any]:
    if not api_key:
        return {"has_reply": False, "summary": "", "sentiment": "neutral"}
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
        prompt1 = "Look at this LinkedIn message thread screenshot. The left side messages are from the account owner (me). Has the other person sent any message in this thread? Answer only: YES or NO"
        response1 = model.generate_content([{"mime_type": "image/png", "data": b64}, prompt1])
        answer = response1.text.strip().upper() if response1.text else "NO"
        if "YES" in answer:
            prompt2 = "Summarize what the other person said in one sentence. Then classify their tone as: positive, neutral, or negative. Format: SUMMARY: [one sentence] | SENTIMENT: [positive/neutral/negative]"
            response2 = model.generate_content([{"mime_type": "image/png", "data": b64}, prompt2])
            text = response2.text if response2.text else "SUMMARY: Reply detected | SENTIMENT: neutral"
            summary = "Reply detected"
            sentiment = "neutral"
            if "SUMMARY:" in text:
                summary = text.split("SUMMARY:")[1].split("|")[0].strip()
            if "SENTIMENT:" in text:
                sentiment = text.split("SENTIMENT:")[1].strip().lower().split()[0]
            return {"has_reply": True, "summary": summary, "sentiment": sentiment}
        return {"has_reply": False, "summary": "", "sentiment": "neutral"}
    except Exception as e:
        print(f"[GEMINI] Error: {e}")
        return {"has_reply": False, "summary": "", "sentiment": "neutral"}

def suggest_locator_from_screenshot(screenshot_bytes: bytes, element_name: str, api_key: str) -> str:
    if not api_key:
        return ""
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
        prompt = f"This is a LinkedIn page. I am trying to find the {element_name} button. Please identify the most likely CSS selector or text content I should use to find this button. Return ONLY the selector string, nothing else."
        response = model.generate_content([{"mime_type": "image/png", "data": b64}, prompt])
        return response.text.strip() if response.text else ""
    except Exception as e:
        print(f"[GEMINI] Locator suggestion error: {e}")
        return ""
