# Ollama Chat Completion Integration

## What's Changed ✅

**OLD**: Used `/api/generate` endpoint (completions API)
**NEW**: Uses `/api/chat` endpoint (chat completion API) with system prompts

This provides **better formatting, rephrasing, and structured output** for Jira stories.

---

## How It Works

### 1. User Input
```
Title: "Automation for Sales Team"
Description: "the sales team currently downloads daily sales data manually from the system"
```

### 2. Backend Processing

#### Step 1: Request Received
```
🚀 [ENHANCE REQUEST] Starting enhancement process...
   📝 Title: "Automation for Sales Team"
   📝 Description: "the sales team currently downloads daily sales..."
```

#### Step 2: Connect to Ollama
```
🤖 [OLLAMA] Attempting to call Ollama with model: "mistral"...

📡 [OLLAMA HTTP] Attempting HTTP connection to localhost:11434...
   ✅ Successfully connected to Ollama
```

#### Step 3: Send Chat Request
```
📤 [OLLAMA CHAT] Sending request to /api/chat...
```

**Payload sent to Ollama:**
```json
{
  "model": "mistral",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert Jira story writer. Your task is to:\n1. Reformat the user input into a professional Jira user story\n2. Rephrase and improve the wording\n3. Add proper structure with Context, Description, and Acceptance Criteria\n4. Keep it concise but comprehensive\n\nReturn ONLY valid JSON (no markdown, no code blocks) with this exact structure:\n{\n  \"title\": \"Concise, action-oriented title\",\n  \"description\": \"Well-structured description with sections\"\n}"
    },
    {
      "role": "user",
      "content": "Title: Automation for Sales Team\nDescription: the sales team currently downloads daily sales data manually from the system\n\nPlease format this into a professional Jira user story with proper structure and improved wording."
    }
  ],
  "stream": false,
  "temperature": 0.7
}
```

#### Step 4: Receive Response
```
✅ [OLLAMA RESPONSE] Received response from chat model
   📄 Response content length: 450 chars
```

**Response from Ollama (example):**
```json
{
  "title": "Automate Daily Sales Data Import Process",
  "description": "h3. Context\nThe sales team currently performs manual daily downloads of sales data from the system, which is time-consuming and error-prone.\n\nh3. Description\nImplement an automated solution to handle daily sales data imports, reducing manual effort and improving data consistency.\n\nh3. Acceptance Criteria\n- Daily data import completes without manual intervention\n- Data integrity is maintained\n- Error notifications are sent to the team\n- Process runs at scheduled time"
}
```

#### Step 5: Parse JSON Response
```
   ✅ Successfully parsed JSON response
      Title: "Automate Daily Sales Data Import Process"
      Description: "h3. Context\nThe sales team currently performs manual..."
```

#### Step 6: Return to Frontend
```json
{
  "enhancedTitle": "Automate Daily Sales Data Import Process",
  "enhancedDescription": "h3. Context\nThe sales team currently...",
  "source": "ollama"
}
```

### 3. Frontend Updates UI

The form fields are automatically filled with:
- **Title**: Professional, action-oriented phrasing
- **Description**: Well-structured with Context, Description, and Acceptance Criteria

### 4. User Reviews and Creates Issue

User can:
- Review the enhanced content
- Make additional edits if needed
- Click "Create Issue" to submit to Jira

---

## System Prompt

The system prompt instructs the model to:

```
You are an expert Jira story writer. Your task is to:
1. Reformat the user input into a professional Jira user story
2. Rephrase and improve the wording
3. Add proper structure with Context, Description, and Acceptance Criteria
4. Keep it concise but comprehensive

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "title": "Concise, action-oriented title",
  "description": "Well-structured description with sections"
}
```

This ensures:
- ✅ Professional formatting
- ✅ Consistent structure
- ✅ JSON output for parsing
- ✅ Improved wording
- ✅ Clear acceptance criteria

---

## Error Handling

### Scenario 1: JSON Parsing Fails
```
⚠️  [OLLAMA] Failed to parse JSON: Unexpected token
    Raw response: "The automated process should..."
```

Falls back to treating the entire response as raw description.

### Scenario 2: Ollama Not Running
```
❌ [OLLAMA HTTP ERROR] connect ECONNREFUSED 127.0.0.1:11434
   Status: undefined
   Error: connect ECONNREFUSED 127.0.0.1:11434

❌ [OLLAMA FAILED] Ollama not available, using fallback rewriter
```

Uses the built-in fallback rewriter (deterministic formatting, no AI).

### Scenario 3: Markdown Code Blocks in Response
```json
// Response might include:
"```json\n{\"title\": \"...\", ...}\n```"
```

The parser automatically strips markdown code blocks before parsing JSON.

---

## Supported Ollama Models

Default: `mistral` (if available)

**Recommended models for story writing:**
- `mistral` - Fast, good quality ✅
- `neural-chat` - Optimized for chat
- `orca-mini` - Lightweight option
- `llama2` - General purpose

**Configuration:**

Option 1: Environment variable
```bash
export OLLAMA_MODEL=mistral
npm start
```

Option 2: In `.env` file
```properties
OLLAMA_MODEL=mistral
```

Option 3: Runtime override
```javascript
// Sent in enhance request
{
  "title": "...",
  "description": "...",
  "model": "neural-chat"  // Override default
}
```

---

## Setup & Usage

### 1. Install Ollama
Download from: https://ollama.ai

### 2. Start Ollama Server
```bash
ollama serve
```

### 3. Pull a Model
```bash
ollama pull mistral
# or
ollama pull neural-chat
# or
ollama pull orca-mini
```

### 4. Start the Jira App
```bash
npm start
```

### 5. Test Enhancement
1. Go to http://localhost:3001
2. Configure Jira credentials
3. Enter a title and description
4. Click "Enhance & Preview"
5. Watch the terminal for logs
6. Review the enhanced content in the form

---

## Terminal Output Example

When you click "Enhance & Preview":

```
🚀 [ENHANCE REQUEST] Starting enhancement process...
   📝 Title: "Automate Sales Report Generation"
   📝 Description: "Currently sales reports are generated manually..."

🤖 [OLLAMA] Attempting to call Ollama with model: "mistral"...

📡 [OLLAMA HTTP] Attempting HTTP connection to localhost:11434...
   ✅ Successfully connected to Ollama

📤 [OLLAMA CHAT] Sending request to /api/chat...

✅ [OLLAMA RESPONSE] Received response from chat model
   📄 Response content length: 520 chars

   ✅ Successfully parsed JSON response
      Title: "Implement Automated Daily Sales Report Generation"
      Description: "h3. Context\nManual generation of sales reports is..."
```

---

## What Gets Better

**Original Input:**
```
Title: automate sales reports
Description: Sales guys need automated reports daily. Reports should be daily and emailed automatically.
```

**After Ollama Enhancement:**
```
Title: Implement Automated Daily Sales Report Generation

Description:
h3. Context
Sales team currently generates reports manually on a daily basis, which is time-consuming and prone to delays.

h3. Description
Automate the daily sales report generation process to improve efficiency and ensure timely delivery to stakeholders.

h3. Acceptance Criteria
- Daily reports are generated automatically without manual intervention
- Reports are emailed to stakeholders at scheduled time
- All data is accurate and up-to-date
- Process includes error handling and notifications
```

**Benefits:**
✅ Professional language
✅ Action-oriented title
✅ Clear structure (Context, Description, Criteria)
✅ Specific acceptance criteria
✅ Ready for Jira

---

## Fallback Mode

If Ollama is not available:

```
❌ [OLLAMA FAILED] Ollama not available, using fallback rewriter
📋 [Fallback Rewriter] Applied
   ✨ Fallback applied - Title: "Automate Sales Reports"
   ✨ Fallback applied - Description: "h3. Context..."
```

The fallback:
- Title-cases the title
- Creates basic structure (Context, Details, Acceptance Criteria)
- Cleans whitespace
- No AI, but still structured

---

## Technical Details

**API Endpoint Used:** `/api/chat`

**Parameters:**
- `model` - The Ollama model to use
- `messages` - Array of chat messages (system + user)
- `stream` - Set to `false` for full response
- `temperature` - Set to `0.7` for balanced creativity

**Response Structure:**
```json
{
  "model": "mistral",
  "created_at": "2025-11-12T...",
  "message": {
    "role": "assistant",
    "content": "{\"title\": \"...\", \"description\": \"...\"}"
  },
  "done": true
}
```

**Timeout:** 30 seconds

---

## Tips for Better Results

1. **Provide Context**: Include more detail in the description
   - ❌ "Build automation"
   - ✅ "Automate daily sales report generation for the sales team"

2. **Be Specific**: Mention the problem and desired outcome
   - ❌ "Fix the process"
   - ✅ "Currently manual, should be automated"

3. **Use Better Models**: Larger models produce better stories
   - Mistral: Good balance ✅
   - Neural-chat: Good for conversations
   - Llama2: General purpose

4. **Adjust Temperature**: Lower for consistency, higher for creativity
   - Current: `0.7` (balanced)
   - More precise: `0.3`
   - More creative: `0.9`

---

## Troubleshooting

**Issue**: "Ollama not responding"
```
Solution: 
1. Start Ollama: ollama serve
2. Check: http://localhost:11434/api/models
3. Verify firewall isn't blocking port 11434
```

**Issue**: "JSON parsing failed"
```
Solution:
- Check model output in terminal
- Verify model supports JSON output
- Try a different model (mistral is most reliable)
```

**Issue**: "Response takes too long"
```
Solution:
- Use a smaller, faster model (orca-mini)
- Increase timeout in code if needed
- Check system resources
```

**Issue**: "Empty or incomplete response"
```
Solution:
- Verify model is fully loaded: ollama show mistral
- Increase max tokens if needed
- Try pulling the model again: ollama pull mistral
```

---

## Next Steps

1. **Start Ollama**: `ollama serve`
2. **Pull a model**: `ollama pull mistral`
3. **Start app**: `npm start`
4. **Test enhancement**: Go to http://localhost:3001
5. **Monitor logs**: Watch terminal for detailed flow
6. **Create Jira issues**: Use enhanced stories!

Enjoy! 🚀
