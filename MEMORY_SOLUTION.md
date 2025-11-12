# 🚨 MEMORY ISSUE - ACTION REQUIRED

## Problem
Your system has only **0.72 GB FREE** out of **7.84 GB total**.

Both installed models need too much memory:
- ❌ **llama3:8b**: Needs ~6.5 GB
- ⚠️ **gemma3:4b**: Needs ~4.7 GB → **Currently timing out**

## Solutions

### Option 1: FREE UP MEMORY (Quick)
Close these applications to free ~2-3 GB:
- ✖️ Chrome/Edge browsers
- ✖️ VS Code
- ✖️ Spotify, Discord
- ✖️ Heavy applications

Then restart Ollama and try again.

### Option 2: Download a Tiny Model (Permanent Fix)
Get a super lightweight model that only needs 1-2 GB:

**In terminal:**
```powershell
ollama pull phi
```

Then update `.env`:
```properties
OLLAMA_MODEL=phi:latest
```

**Model comparison:**
- **phi**: 2.7 GB model, ~1.5 GB memory needed ✅ BEST FOR LOW MEMORY
- **orca-mini**: 1.3 GB model, ~2 GB memory needed ✅ SUPER TINY
- **neural-chat**: 4.1 GB model, ~6 GB memory needed
- **gemma3:4b**: 3.11 GB model, ~4.7 GB memory needed ⚠️ TOO HEAVY
- **llama3:8b**: 4.34 GB model, ~6.5 GB memory needed ❌ WAY TOO HEAVY

### Recommended: Use "phi"
```powershell
ollama pull phi
```

## Steps to Fix

### Method A: Install Lighter Model (5 mins)
1. **Stop Ollama** (close the terminal running `ollama serve`)
2. **Wait 30 seconds** for it to unload models
3. **Download phi**:
   ```powershell
   ollama pull phi
   ```
4. **Update `.env`**:
   ```properties
   OLLAMA_MODEL=phi:latest
   ```
5. **Restart Ollama**:
   ```powershell
   ollama serve
   ```
6. **Restart Jira app**:
   ```powershell
   npm start
   ```

### Method B: Free Up Memory (Immediate)
1. **Close Chrome, VS Code, Discord, Spotify, etc.**
2. **Run**: `taskkill /F /IM chrome.exe` (close all Chrome processes)
3. **Restart Ollama** and Jira app
4. **Try enhancement again**

## After Fixing

Run this to verify:
```powershell
node system-check.js
```

Should show:
```
Free Memory: 2.00+ GB
```

Then test "Enhance & Preview" - it should work!

## Quick Fix Script

Save this as `fix-memory.ps1`:
```powershell
# Close memory-heavy apps
taskkill /F /IM chrome.exe -ErrorAction SilentlyContinue
taskkill /F /IM msedge.exe -ErrorAction SilentlyContinue
taskkill /F /IM Spotify.exe -ErrorAction SilentlyContinue
taskkill /F /IM Discord.exe -ErrorAction SilentlyContinue

Write-Host "Applications closed. Waiting 5 seconds..."
Start-Sleep -Seconds 5

Write-Host "Checking memory..."
node system-check.js
```

Run with:
```powershell
./fix-memory.ps1
```

## Why This Happens

Ollama loads models into GPU/System RAM. When you don't have enough free memory:
- Model struggles to load
- Request times out (45+ seconds)
- Falls back to simple formatter

## Result After Fixing

✅ Ollama will load quickly
✅ Model will respond in 5-10 seconds
✅ Enhanced stories will be professional and AI-generated
✅ No more timeouts

---

## Recommended Path Forward

1. **Download phi** (takes 2-3 minutes):
   ```powershell
   ollama pull phi
   ```

2. **Update `.env`**:
   ```properties
   OLLAMA_MODEL=phi:latest
   ```

3. **Restart everything** and test!

**This is the BEST solution for your system resources.** 🎯
