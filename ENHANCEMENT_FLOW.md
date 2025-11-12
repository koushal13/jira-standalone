# Jira Story Enhancement Flow - Detailed Documentation

## Problem Fixed ✅
The fallback rewriter was creating **duplicate content** when you clicked "Enhance & Preview" multiple times.

### Root Cause
The `fallbackRewriter()` function was:
1. Repeating "Context:" and "Details:" labels
2. Adding duplicate "Acceptance Criteria" sections
3. Not properly separating content sections

## Solution
Refactored the fallback function to:
- Properly split input into paragraphs
- Create clean, non-duplicate structured output
- Use Jira-formatted headings (`h3.` syntax)

---

## Complete Enhancement Flow (with Logging)

### 1. User clicks "Enhance & Preview" Button

**Input Example:**
```
Title: "Write an automation to create jira stories automatically"
Description: "Write an automation to create jira stories automatically"
```

### 2. Frontend sends POST request to `/api/enhance`

```json
{
  "title": "Write an automation to create jira stories automatically",
  "description": "Write an automation to create jira stories automatically",
  "model": null (optional)
}
```

### 3. Backend Logs Show:
```
🚀 [ENHANCE REQUEST] Starting enhancement process...
   📝 Title: "Write an automation to create jira stories automatically"
   📝 Description: "Write an automation to create jira stories automatically"

🤖 [OLLAMA] Attempting to call Ollama with model: "gemma3:4b"...

📡 [OLLAMA HTTP] Attempting HTTP connection to localhost:11434...
   ⚠️  Ping failed, attempting to list models...
   ❌ Models list failed - Ollama not responding

❌ [OLLAMA FAILED] Ollama not available, using fallback rewriter

📋 [Fallback Rewriter] Applied
   ✨ Fallback applied - Title: "Write An Automation To Create Jira Stories Automatically"
   ✨ Fallback applied - Description: "h3. Context..."
```

### 4. Ollama Connection Attempts (in order):

#### Step 4A: HTTP API Check
```
📡 [OLLAMA HTTP] Attempting HTTP connection to localhost:11434...
   - Tries: GET http://localhost:11434/api/ping
   - If fails: GET http://localhost:11434/api/models
   - If succeeds: POST http://localhost:11434/api/generate
```

#### Step 4B: CLI Fallback (if HTTP fails)
```
🔄 [OLLAMA CLI] Attempting CLI fallback with 'ollama' command...
   🖥️  Executing: ollama generate gemma3:4b --prompt "..."
   
   If fails:
   ⚠️  'ollama generate' failed, trying 'ollama run'...
   🖥️  Executing: ollama run gemma3:4b "..."
```

### 5. Three Possible Outcomes:

#### ✅ Outcome A: Ollama Success (JSON Response)
```
✅ [OLLAMA SUCCESS] Model responded successfully
   📊 Parsed JSON response:
      Title: "Setup Automation for Jira Story Creation"
      Description: "{...structured description from Ollama...}"
      
Response: { source: 'ollama', enhancedTitle: "...", enhancedDescription: "..." }
```

#### ⚠️ Outcome B: Ollama Success (Non-JSON Response)
```
✅ [OLLAMA SUCCESS] Model responded successfully
⚠️  [OLLAMA] Response was not JSON, returning as raw text

Response: { source: 'ollama-raw', enhancedTitle: "...", enhancedDescription: "{raw model output}" }
```

#### ❌ Outcome C: Ollama Not Available (Fallback)
```
❌ [OLLAMA FAILED] Ollama not available, using fallback rewriter
📋 [Fallback Rewriter] Applied

Response: { source: 'fallback', enhancedTitle: "...", enhancedDescription: "{structured text}" }
```

### 6. Frontend Updates UI

The enhanced content is automatically filled back into the form fields:
```javascript
if (data.enhancedTitle) document.getElementById('summary').value = data.enhancedTitle;
if (data.enhancedDescription) document.getElementById('description').value = data.enhancedDescription;

showAlert('create-alert', `✅ Enhanced (${data.source}). Review and hit Create to submit.`, 'success');
```

### 7. User Reviews Content

Content now appears **without duplicates**. The three sections are:
- **h3. Context** - Main problem/context
- **h3. Details** - Additional details or steps  
- **h3. Acceptance Criteria** - Clear criteria

### 8. User Clicks "Create Issue"

The enhanced content is sent to Jira API and issue is created with the structured format.

---

## Configuration

### Environment Variables (.env)

```properties
# Required
JIRA_DOMAIN=your_domain
JIRA_EMAIL=your_email@atlassian.com
JIRA_TOKEN=your_api_token

# Optional
PORT=3001
OLLAMA_MODEL=gemma3:4b
```

### Supported Ollama Models

Default: `gemma3:4b` (if available on your machine)

Other popular models:
- `mistral`
- `llama2`
- `neural-chat`
- `orca-mini`

To use a different model in UI, pass it in the enhance request.

---

## Testing the Flow

### Test 1: Without Ollama (Fallback)
1. Ensure Ollama is **NOT running**
2. Click "Enhance & Preview"
3. Check terminal for fallback logs
4. Verify **no duplicates** in preview

### Test 2: With Ollama (HTTP API)
1. Start Ollama: `ollama serve`
2. Pull a model: `ollama pull gemma3:4b`
3. Click "Enhance & Preview"
4. Check terminal for Ollama HTTP logs
5. Review enhanced content

### Test 3: Multiple Enhance Clicks
1. Click "Enhance & Preview" twice
2. Verify content is **not duplicated** each time
3. Each enhancement should replace previous content

---

## Key Improvements Made

✅ Fixed duplicate content in fallback rewriter
✅ Added comprehensive logging at each step
✅ Clear section separation (Context, Details, Acceptance Criteria)
✅ Environment variable support for Ollama model
✅ HTTP API and CLI fallback for Ollama
✅ Proper error handling and user feedback
✅ JSON or raw text support from Ollama responses

---

## Terminal Output Example

When you click "Enhance & Preview", you'll see real-time logs in the terminal:

```
🚀 [ENHANCE REQUEST] Starting enhancement process...
   📝 Title: "Write an automation..."
   📝 Description: "Write an automation..."

🤖 [OLLAMA] Attempting to call Ollama with model: "gemma3:4b"...

📡 [OLLAMA HTTP] Attempting HTTP connection to localhost:11434...
   ⚠️  Ping failed, attempting to list models...
   ❌ Models list failed - Ollama not responding

❌ [OLLAMA FAILED] Ollama not available, using fallback rewriter
📋 [Fallback Rewriter] Applied
   ✨ Fallback applied - Title: "Write An Automation..."
   ✨ Fallback applied - Description: "h3. Context..."
```

---

## Next Steps

1. **Run the app**: `npm start` → Open http://localhost:3001
2. **Configure Jira**: Enter domain, email, and API token
3. **Create a story**: Enter title and description
4. **Click "Enhance & Preview"**: See terminal logs in real-time
5. **Review the enhanced content**: No duplicates!
6. **Click "Create Issue"**: Submit to Jira

---

## Security Notes

⚠️ **IMPORTANT**
- `.env` file contains your API token - **NEVER commit it to git**
- It's already in `.gitignore` to prevent accidental commits
- Store sensitive credentials in environment variables only
- Always regenerate tokens if accidentally exposed

For more info, see `.env.example` for the configuration template.
