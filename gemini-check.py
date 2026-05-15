import google.generativeai as genai

# 1. Configure the SDK with your API key
API_KEY = "AIzaSyBQLoIglDQA4AYA-PomNuqPMFKxVQqjbGM"
genai.configure(api_key=API_KEY)

def check_gemini_key():
    try:
        # 2. Attempt to list available models
        # This is a lightweight way to verify the key without generating content
        print("Checking API key...")
        models = genai.list_models()
        
        print("✅ Key is working! Available models:")
        for m in models:
            if 'generateContent' in m.supported_generation_methods:
                print(f" - {m.name}")
                
    except Exception as e:
        print(f"❌ Key check failed: {e}")

if __name__ == "__main__":
    check_gemini_key()
