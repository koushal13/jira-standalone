# ⚡ QUICK START: Fix in 5 Minutes

## Your System Status
- **Free Memory**: 0.72 GB ❌ **Too low**
- **Models installed**: llama3:8b (6.5GB needed), gemma3:4b (4.7GB needed)
- **Problem**: Models timing out because not enough memory

## 3-Step Solution

### STEP 1: Download Phi (2-3 minutes)
Open PowerShell and run:
```powershell
ollama pull phi
```

Wait until it finishes. You'll see progress:
```
pulling 2c05b36... 100% ████████████ 1.4GB
```

### STEP 2: Update Configuration (30 seconds)
Open `.env` file and change:
```properties
OLLAMA_MODEL=phi:latest
```

### STEP 3: Restart & Test (2 minutes)

**Terminal 1:**
```powershell
ollama serve
```

**Terminal 2:**
```powershell
cd jira-standalone
npm start
```

**Browser:** http://localhost:3001
- Configure Jira
- Enter title/description  
- Click "Enhance & Preview"

✅ **It will work now!**

---

## What You'll See

### Before (Timing Out)
```
❌ timeout of 45000ms exceeded
```

### After (Working)
```
✅ [OLLAMA RESPONSE] Received response from chat model
✅ Successfully parsed JSON response
   Title: "Your enhanced title here"
```

---

## Why This Works

- **phi**: 1.4 GB (you can load it)
- **gemma3:4b**: 3.11 GB (too big, causes timeout)
- **Memory available**: 0.72 GB (need 1.5 GB for phi)

**Action**: Close Chrome/VS Code first if needed to free up 1GB.

---

## That's It!

5 minutes and you're done. 🎉

See: `SYSTEM_ANALYSIS.md` for full details.
