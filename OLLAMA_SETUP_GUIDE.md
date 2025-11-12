# Ollama Setup & Troubleshooting Guide

## Quick Test: Is Ollama Running?

**Via Browser:**
1. Open: http://localhost:11434/api/tags
2. Should see JSON with your installed models

**Via Terminal:**
```powershell
Invoke-WebRequest http://localhost:11434/api/tags
```

**Via Jira App:**
- Go to http://localhost:3001
- Check browser console for network requests
- Or check terminal logs when clicking "Enhance & Preview"

---

## Step 1: Install Ollama

**Download:**
- Visit: https://ollama.ai
- Download for Windows
- Run installer and follow setup

**Verify Installation:**
```powershell
ollama --version
```

Should output something like: `ollama version 0.1.26` (version may vary)

---

## Step 2: Start Ollama Server

**In a new terminal/PowerShell:**
```powershell
ollama serve
```

You should see:
```
time=2025-11-12T... level=INFO msg="Listening on 127.0.0.1:11434" msg="Listening on [::1]:11434"
```

**Keep this terminal open** while using the Jira app.

---

## Step 3: Download a Model

**Recommended models for story writing:**

```powershell
# Fast and good quality (Recommended first)
ollama pull mistral

# Or alternatives
ollama pull neural-chat
ollama pull orca-mini
ollama pull llama2
```

This downloads the model (can take a few minutes depending on your internet).

You should see progress like:
```
pulling manifest
pulling 2c05b36... 100% ▓▓▓▓▓▓▓▓▓▓▓▓▓ 5.0GB
pulling 8c217e0... 100% ▓▓▓▓▓▓▓▓▓▓▓▓▓ 1.3KB
pulling 7590d2c... 100% ▓▓▓▓▓▓▓▓▓▓▓▓▓ 486B
```

---

## Step 4: Verify Model is Available

**Check all available models:**
```powershell
ollama list
```

Should show something like:
```
NAME                 ID              SIZE      MODIFIED
mistral:latest       2c05b365cbf2    5.0GB     2 minutes ago
neural-chat:latest   1f5e0ba29...    5.2GB     1 hour ago
```

**Test model directly:**
```powershell
ollama run mistral "Write a hello world"
```

---

## Step 5: Configure Jira App (Optional)

**In `.env` file:**
```properties
JIRA_DOMAIN=your_domain
JIRA_EMAIL=your_email@atlassian.com
JIRA_TOKEN=your_api_token
OLLAMA_MODEL=mistral
```

If not set, defaults to `mistral`.

---

## Step 6: Test the Integration

### Method A: Via Browser Test Endpoint

1. **Start the Jira app:**
   ```powershell
   cd jira-standalone
   npm start
   ```

2. **Open browser and test:**
   ```
   http://localhost:3001/api/ollama-test
   ```

3. **Should see JSON response:**
   ```json
   {
     "running": true,
     "models": [
       "mistral:latest",
       "neural-chat:latest"
     ]
   }
   ```

### Method B: Via Terminal Logs

1. **Watch terminal while Jira app runs**
2. **Go to app at http://localhost:3001**
3. **Configure Jira credentials**
4. **Enter a title and description**
5. **Click "Enhance & Preview"**
6. **Watch terminal for logs:**

**Success logs look like:**
```
🚀 [ENHANCE REQUEST] Starting enhancement process...
   📝 Title: "Automation for Sales"
   📝 Description: "Sales team needs automation..."

🤖 [OLLAMA] Attempting to call Ollama with model: "mistral"...

📡 [OLLAMA HTTP] Attempting HTTP connection to localhost:11434...
   ✅ Ollama ping successful (status: 200)
   ✅ Successfully connected to Ollama

📤 [OLLAMA CHAT] Sending chat request to model: "mistral"...
   System prompt length: 456 chars
   User message length: 89 chars

✅ [OLLAMA RESPONSE] Received response from chat model
   Response status: 200
   📄 Response content length: 520 chars
   📄 First 100 chars: {
  "title": "Implement Sales Data Automation...

   ✅ Successfully parsed JSON response
      Title: "Implement Sales Data Automation"
      Description: "h3. Context..."
```

**Failure logs look like:**
```
🚀 [ENHANCE REQUEST] Starting enhancement process...
   📝 Title: "Automation for Sales"
   📝 Description: "Sales team needs automation..."

🤖 [OLLAMA] Attempting to call Ollama with model: "mistral"...

📡 [OLLAMA HTTP] Attempting HTTP connection to localhost:11434...
   ⚠️  Ping failed: connect ECONNREFUSED 127.0.0.1:11434
   ❌ Models list also failed: connect ECONNREFUSED 127.0.0.1:11434
   ❌ Ollama is NOT responding on localhost:11434
   💡 Make sure Ollama is running: ollama serve

❌ [OLLAMA FAILED] Ollama not available, using fallback rewriter
📋 [Fallback Rewriter] Applied
```

---

## Troubleshooting

### Problem: "ECONNREFUSED"
```
⚠️  Ping failed: connect ECONNREFUSED 127.0.0.1:11434
```

**Solution:**
1. Open new terminal
2. Run: `ollama serve`
3. Keep it running while using the app

### Problem: "No models found"
```
✅ [OLLAMA TEST] Found 0 models
```

**Solution:**
1. Download a model: `ollama pull mistral`
2. Wait for download to complete
3. Verify: `ollama list`
4. Restart Jira app

### Problem: "Model not found when generating"
```
❌ Error: pull <model-name>: unknown model
```

**Solution:**
- Make sure model name is correct: `ollama list`
- Try default: `ollama pull mistral`
- Check `.env` file for correct model name

### Problem: "Timeout or slow response"
```
❌ [OLLAMA HTTP ERROR] Request failed
   Error message: timeout of 45000ms exceeded
```

**Solution:**
1. Check system resources (RAM, CPU)
2. Try smaller model: `ollama pull orca-mini`
3. Restart Ollama: `ollama serve`
4. Check internet connection

### Problem: "JSON parsing error"
```
⚠️  [OLLAMA] Failed to parse JSON: Unexpected token
```

**Solution:**
- Try a different model
- Mistral is most reliable for JSON
- Check model output in terminal logs

### Problem: "Empty response from Ollama"
```
⚠️  No message content in response
```

**Solution:**
- Verify model is fully loaded: `ollama show mistral`
- Restart Ollama
- Try different model

---

## Complete Setup Example

**Terminal 1: Start Ollama**
```powershell
ollama serve
```

**Terminal 2: Download Model**
```powershell
ollama pull mistral
ollama list
```

**Terminal 3: Start Jira App**
```powershell
cd c:\Users\koush\jira-assistant\jira-standalone
npm start
```

**Browser:**
1. Go to http://localhost:3001
2. Configure Jira (Configure tab)
   - Domain: koushal13
   - Email: koushal13@gmail.com
   - API Token: (your token)
3. Go to Create Issue tab
4. Enter title and description
5. Click "Enhance & Preview"
6. **Watch terminal for detailed logs!**
7. Review enhanced content
8. Click "Create Issue"

---

## Expected Flow with Ollama Working

1. **User enters:** 
   - Title: "Sales automation"
   - Description: "Team needs to automate daily sales reports"

2. **Backend logs:**
   ```
   📡 [OLLAMA HTTP] Attempting HTTP connection...
   ✅ Successfully connected to Ollama
   📤 [OLLAMA CHAT] Sending chat request...
   ✅ [OLLAMA RESPONSE] Received response
   ✅ Successfully parsed JSON response
   ```

3. **Enhanced output:**
   ```
   Title: "Implement Automated Daily Sales Report Generation"
   
   Description:
   h3. Context
   The sales team manually generates daily sales reports, 
   which is time-consuming and error-prone.
   
   h3. Details
   Implement automated solution to generate reports daily 
   at specified time with proper formatting.
   
   h3. Acceptance Criteria
   - Daily reports generated automatically
   - Reports delivered via automated system
   - Data accuracy maintained
   - Error handling and logging implemented
   ```

4. **Result:** Professional, well-formatted Jira story!

---

## Ports Used

- **Jira App**: http://localhost:3001
- **Ollama API**: http://localhost:11434
  - Health check: http://localhost:11434/api/ping
  - Models list: http://localhost:11434/api/tags
  - Chat API: http://localhost:11434/api/chat

Make sure these ports are not blocked by firewall!

---

## Quick Checklist

- [ ] Ollama installed
- [ ] `ollama serve` running in terminal
- [ ] Model downloaded (`ollama pull mistral`)
- [ ] Model shows in `ollama list`
- [ ] `npm start` running in jira-standalone directory
- [ ] Browser open at http://localhost:3001
- [ ] Jira credentials configured
- [ ] Click "Enhance & Preview"
- [ ] Check terminal logs for connection messages
- [ ] Enhanced content appears in form

---

## If Still Not Working

**Enable verbose logging by checking terminal output:**

When you click "Enhance & Preview", look for:

1. `🚀 [ENHANCE REQUEST]` - Request received
2. `🤖 [OLLAMA] Attempting to call...` - Trying to connect
3. `📡 [OLLAMA HTTP]` - Connection attempt
4. Either `✅` (success) or `❌` (failure)
5. If `❌`, it shows why and fallback is used

**Screenshot or share the full terminal output** if still having issues!

---

## Additional Resources

- **Ollama Docs**: https://github.com/jmorganca/ollama
- **Available Models**: https://ollama.ai/library
- **Model Details**: `ollama show mistral`

Enjoy the automated story enhancement! 🚀
