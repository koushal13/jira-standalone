# Quick Fix: Download Phi Model

## Problem
Your system has only 0.72 GB free memory, but needs 4-6 GB for current models.
**Solution**: Download **phi** - a super tiny model that only needs ~1.5 GB.

## 3-Step Fix

### Step 1: Stop Ollama (if running)
Press `Ctrl+C` in the terminal where `ollama serve` is running.

Wait for it to fully stop (30 seconds).

### Step 2: Download Phi Model
Open a NEW terminal and run:
```powershell
ollama pull phi
```

You'll see:
```
pulling manifest
pulling 2c05b36... 100% ▓▓▓▓▓▓▓▓▓▓▓▓▓ 1.4GB
pulling 8c217e0... 100% ▓▓▓▓▓▓▓▓▓▓▓▓▓ 1.3KB
pulling 7590d2c... 100% ▓▓▓▓▓▓▓▓▓▓▓▓▓ 486B
```

This takes **2-3 minutes**.

### Step 3: Verify It's There
```powershell
ollama list
```

Should show:
```
NAME                 ID              SIZE      MODIFIED
phi:latest           xxx             1.4GB     now
llama3:8b            xxx             4.34GB    earlier
gemma3:4b            xxx             3.11GB    earlier
```

## Done! Now Restart

### Terminal 1: Start Ollama
```powershell
ollama serve
```

### Terminal 2: Start Jira App
```powershell
cd jira-standalone
npm start
```

### Browser: Test It
1. Go to http://localhost:3001
2. Configure Jira
3. Enter title and description
4. Click "Enhance & Preview"
5. **Watch the terminal** - should work now! ✅

## Why Phi Works

- **Size**: 1.4 GB (vs 3-4 GB)
- **Memory**: ~1.5 GB needed (you have 0.72 GB free now)
- **Speed**: Very fast (5-10 seconds response)
- **Quality**: Good for basic story formatting

## Expected Logs When Working

```
📤 [OLLAMA CHAT] Sending chat request to model: "phi:latest"...
   System prompt length: 578 chars
   User message length: 735 chars

✅ [OLLAMA RESPONSE] Received response from chat model
   Response status: 200
   📄 Response content length: 320 chars

   ✅ Successfully parsed JSON response
      Title: "Professional title here"
      Description: "h3. Context..."
```

## If Still Timing Out

1. **Close more applications**: Chrome, VS Code, Discord, Spotify
2. **Free up memory**: Run `taskkill /F /IM chrome.exe`
3. **Check memory**: Run `node system-check.js`
4. **Make sure at least 2GB is free**
5. **Then restart Ollama and try again**

## Verify Memory is Good

```powershell
node system-check.js
```

Look for:
```
Free Memory: 2.00+ GB ✅
```

---

## Alternative: Ultra-Tiny Model

If phi still times out, use **orca-mini** (even smaller):

```powershell
ollama pull orca-mini
```

Then update `.env`:
```properties
OLLAMA_MODEL=orca-mini:latest
```

---

## Need Help?

Check the logs:
- **Success**: `✅ Successfully parsed JSON response`
- **Timeout**: `Error code: ECONNABORTED` → Free up memory
- **Not found**: `model 'xxx' not found` → Run `ollama list`

**Take 5 minutes to download phi - it will fix everything!** 🎯
