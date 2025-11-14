/**
 * Standalone Jira Web Server
 * Provides a simple web UI to create/update Jira issues
 * Run: node src/server.js
 * Open: http://localhost:3001
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { createJiraIssue, validateJiraConfig, getIssueTypes, getUserProjects, addCommentToIssue } = require('./jiraService');
const axios = require('axios');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store config in memory (or use env vars)
let currentConfig = {
  domain: process.env.JIRA_DOMAIN || '',
  email: process.env.JIRA_EMAIL || '',
  apiToken: process.env.JIRA_TOKEN || '',
};

/**
 * GET / - Serve the main HTML page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Call Ollama Chat Completion API
async function callOllama(model, title, description) {
  try {
    console.log(`\n📡 [OLLAMA HTTP] Attempting HTTP connection to localhost:11434...`);
    
    // Check server health with verbose logging
    let ollamaReachable = false;
    try {
      const ping = await axios.get('http://localhost:11434/api/ping', { timeout: 3000 });
      console.log(`   ✅ Ollama ping successful (status: ${ping.status})`);
      ollamaReachable = true;
    } catch (pingErr) {
      console.log(`   ⚠️  Ping failed: ${pingErr.code || pingErr.message}`);
      
      // Try to list models as alternative check
      try {
        const models = await axios.get('http://localhost:11434/api/tags', { timeout: 3000 });
        console.log(`   ✅ Models list successful, found ${models.data.models?.length || 0} models`);
        ollamaReachable = true;
      } catch (modelsErr) {
        console.log(`   ❌ Models list also failed: ${modelsErr.code || modelsErr.message}`);
        ollamaReachable = false;
      }
    }

    if (!ollamaReachable) {
      console.log(`   ❌ Ollama is NOT responding on localhost:11434`);
      console.log(`   💡 Make sure Ollama is running: ollama serve`);
      console.log(`   💡 Check if port 11434 is available: lsof -i :11434`);
      throw new Error('Ollama service is not running. Please start it with: ollama serve');
    }

    console.log(`   ✅ Successfully connected to Ollama`);

    // Construct the system prompt for story formatting
    const systemPrompt = `You are a professional JIRA story writer. Create clear user stories with NO section headers.

CRITICAL JSON RULES:
1. Use ONLY standard double quotes "text" - NEVER """ triple quotes
2. Escape internal quotes with backslash: "He said \"hello\""
3. Escape newlines with \\n inside strings
4. Title: Complete descriptive sentence (8-15 words) starting with action verb
5. Description: NO headers - start directly with user story
6. Return ONLY valid JSON with proper escaping

CORRECT FORMAT:
{"title":"Descriptive Action Title","description":"As a [role], I want [capability] so that [benefit].\\n\\n[Explanation paragraph]\\n\\nAcceptance Criteria:\\n- [Requirement 1]\\n- [Requirement 2]"}

EXAMPLE:
{"title":"Implement Automated Log Scanner for Personal Data Detection","description":"As a security administrator, I want an automated system to scan logs for personal data so that I can prevent breaches.\\n\\nThe system monitors all log files and detects PII patterns.\\n\\nAcceptance Criteria:\\n- Scans logs in real-time\\n- Detects PII with 95% accuracy"}

NEVER use triple quotes """ or unescaped newlines. Always use proper JSON string escaping.`;

    const userMessage = `Create JIRA story for: "${description}"

${title ? `Title suggestion: "${title}"` : ''}

Return valid JSON only - no markdown, no explanations.`;

    console.log(`\n📤 [OLLAMA CHAT] Sending chat request to model: "${model}"...`);
    console.log(`   System prompt length: ${systemPrompt.length} chars`);
    console.log(`   User message length: ${userMessage.length} chars`);

    const resp = await axios.post(
      'http://localhost:11434/api/chat',
      {
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        stream: false,
        temperature: 0.3,
        options: {
          num_ctx: 8192,        // Increased context window
          num_predict: 1024,    // Reduced to ensure completion within limits
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      },
      { timeout: 60000 }  // Increased timeout for longer responses
    );

    console.log(`✅ [OLLAMA RESPONSE] Received response from chat model`);
    console.log(`   Response status: ${resp.status}`);
    
    // Extract the response content
    if (resp.data?.message?.content) {
      const content = resp.data.message.content;
      console.log(`   📄 Response content length: ${content.length} chars`);
      console.log(`   📄 First 100 chars: ${content.substring(0, 100)}...`);
      return content;
    }

    console.log(`   ⚠️  No message content in response`);
    console.log(`   Response data keys: ${Object.keys(resp.data || {}).join(', ')}`);
    throw new Error('Ollama returned empty response. The model may not be loaded.');
  } catch (err) {
    console.log(`\n❌ [OLLAMA HTTP ERROR] Request failed`);
    console.log(`   Error message: ${err.message}`);
    console.log(`   Error code: ${err.code}`);
    
    if (err.response) {
      console.log(`   HTTP Status: ${err.response.status}`);
      console.log(`   Response data: ${JSON.stringify(err.response.data).substring(0, 200)}`);
    }
    
    // Provide specific error messages based on error type
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Ollama. Please start Ollama with: ollama serve');
    } else if (err.code === 'ETIMEDOUT') {
      throw new Error('Ollama request timed out. The model may be too large for your system.');
    } else if (err.response?.status === 404) {
      throw new Error('Ollama model not found. Please pull the model with: ollama pull phi');
    } else if (err.response?.status >= 500) {
      throw new Error('Ollama server error. Try restarting Ollama.');
    }
    
    throw err;
  }
}

function analyzeIssueType(description) {
  const text = description.toLowerCase();
  
  // Bug-related keywords
  if (text.match(/\b(bug|error|fix|crash|issue|problem|broken|fail|not work|doesn't work|won't work|exception|defect)\b/)) {
    return 'Bug';
  }
  
  // Story-related keywords (new features, user capabilities)
  if (text.match(/\b(user|customer|want|need|should be able|feature|functionality|capability|as a|so that)\b/)) {
    return 'Story';
  }
  
  // Epic-related keywords (large initiatives)
  if (text.match(/\b(system|platform|architecture|framework|migration|overhaul|redesign|major|initiative)\b/)) {
    return 'Epic';
  }
  
  // Improvement-related keywords
  if (text.match(/\b(improve|enhance|optimize|better|faster|performance|upgrade|refactor|clean up)\b/)) {
    return 'Improvement';
  }
  
  // Task-related keywords (technical work)
  if (text.match(/\b(configure|setup|install|deploy|create|add|implement|develop|build|update)\b/)) {
    return 'Task';
  }
  
  // Default to Story for user-facing features
  return 'Story';
}

function fallbackRewriter(title, description) {
  // Enhanced fallback rewriter with proper user story format
  function titleCase(s) {
    return s
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/(^|\s)\S/g, (t) => t.toUpperCase())
      .replace(/\b(A|An|The|And|Or|But|In|On|At|To|For|Of|With|By)\b/g, (match) => match.toLowerCase());
  }

  // Generate meaningful title with better extraction logic
  let cleanedTitle = title || '';
  
  // If no title or title is too generic, extract from description
  if (!cleanedTitle || cleanedTitle.length < 8 || cleanedTitle.toLowerCase().includes('enhanced')) {
    console.log('📝 [Fallback] Generating title from description...');
    
    // Look for "I want to" patterns first - extract the main action
    const wantMatch = description.match(/I want to\s+([^,]{10,60})/i);
    if (wantMatch) {
      cleanedTitle = titleCase(`Implement ${wantMatch[1]}`);
    } else {
      // Look for action + object patterns
      const actionMatch = description.match(/\b(create|add|implement|fix|update|develop|build|design|integrate|improve|enable|provide|allow|support|automate|detect|monitor|scan|send|prevent)\s+([^.!?\n]{8,50})/i);
      
      if (actionMatch) {
        cleanedTitle = titleCase(`${actionMatch[1]} ${actionMatch[2]}`);
      } else {
        // Extract key phrases about the system/feature
        const systemMatch = description.match(/\b(program|system|tool|application|service|feature)\s+(that can|to|which|for)\s+([^.!?\n]{8,40})/i);
        if (systemMatch) {
          cleanedTitle = titleCase(`Create ${systemMatch[1]} to ${systemMatch[3]}`);
        } else {
          // Look for main nouns and create a descriptive title
          const nounMatch = description.match(/\b(detect|monitor|scan|identify|track|log|email|notification|alert)\s+([^.!?\n]{5,35})/i);
          if (nounMatch) {
            cleanedTitle = titleCase(`Implement ${nounMatch[1]} ${nounMatch[2]} System`);
          } else {
            // Last resort - use first meaningful sentence
            const firstSentence = description.split(/[.!?\n]/)[0].trim();
            if (firstSentence.length > 15 && firstSentence.length < 80) {
              cleanedTitle = titleCase(firstSentence);
            } else {
              cleanedTitle = 'Implement System Enhancement';
            }
          }
        }
      }
    }
    
    // Ensure title starts with action verb
    if (!cleanedTitle.match(/^(Add|Create|Fix|Update|Implement|Develop|Enable|Provide|Allow|Support|Build|Design|Integrate|Improve|Automate|Detect|Monitor|Prevent)/i)) {
      cleanedTitle = 'Implement ' + cleanedTitle;
    }
    
    // Ensure title is appropriate length (8-80 chars)
    if (cleanedTitle.length > 80) {
      cleanedTitle = cleanedTitle.substring(0, 77) + '...';
    } else if (cleanedTitle.length < 8) {
      cleanedTitle = cleanedTitle + ' System';
    }
    
    console.log(`📝 [Fallback] Generated title: "${cleanedTitle}"`);
  } else {
    // Clean existing title
    cleanedTitle = cleanedTitle
      .replace(/^(fix|create|add|update|implement|develop|automate|detect)/i, (match) => match.charAt(0).toUpperCase() + match.slice(1))
      .replace(/\b(bug|issue|problem)\b/gi, 'Bug Fix')
      .replace(/\b(feature|functionality)\b/gi, 'Feature');
    
    cleanedTitle = titleCase(cleanedTitle);
  }

  // Analyze and suggest issue type
  const suggestedType = analyzeIssueType(description);

  // Clean description
  let cleanedDesc = description
    .replace(/\n{2,}/g, '\n\n')
    .trim();

  // Extract user type, capability, and benefit from input
  let userType = 'user';
  let capability = cleanedDesc;
  let benefit = 'improve their workflow and system efficiency';

  // Try to extract user story components from the input
  const userMatch = cleanedDesc.match(/\b(user|customer|admin|administrator|developer|manager|employee|student|member|visitor|operator|analyst)\b/i);
  if (userMatch) {
    userType = userMatch[1].toLowerCase();
  }

  // Extract "as a" patterns
  const asMatch = cleanedDesc.match(/as (?:an? )?([^,]{3,25})/i);
  if (asMatch) {
    userType = asMatch[1].toLowerCase().trim();
  }

  // Extract "I want to" patterns
  const wantMatch = cleanedDesc.match(/I want to\s+([^,]{5,60})/i);
  if (wantMatch) {
    capability = wantMatch[1].trim();
  } else {
    // Extract main action from description
    capability = cleanedDesc
      .replace(/^(fix|create|add|update|implement|develop|need to|want to|should|automate)\s*/i, '')
      .split(/[.\n]/)[0]
      .trim();
  }

  // Extract "so that" patterns  
  const soThatMatch = cleanedDesc.match(/so that\s+([^.\n]{10,80})/i);
  if (soThatMatch) {
    benefit = soThatMatch[1].trim();
  }

  // Generate user story format
  const userStory = `As ${userType.match(/^[aeiou]/i) ? 'an' : 'a'} ${userType}, I want to ${capability.toLowerCase()}, so that I can ${benefit}.`;

  // Create structured description with plain text formatting (no headers at all)
  let structuredDescription = `${userStory}\n\n${cleanedDesc}\n\nAcceptance Criteria:\n\n• Given the ${userType} has appropriate access permissions, when they attempt to use this feature, then the system should respond appropriately\n• Given valid inputs are provided, when the process executes, then the expected functionality should be delivered successfully\n• Given any errors or edge cases occur, when they are encountered, then the system should handle them gracefully with clear feedback\n• Given the feature is implemented correctly, when tested, then it should meet all specified requirements and perform reliably`;

  console.log('📋 [Fallback Rewriter] Applied professional user story format');
  return { 
    enhancedTitle: cleanedTitle, 
    enhancedDescription: structuredDescription,
    suggestedType: suggestedType
  };
}

/**
 * GET /api/ollama-test - Test if Ollama is running
 */
app.get('/api/ollama-test', async (req, res) => {
  try {
    console.log('\n🔍 [OLLAMA TEST] Checking Ollama connection...');
    
    let ollamaStatus = false;
    let errorMessage = '';
    let models = [];
    
    try {
      // Try models endpoint first (more reliable than ping)
      const modelsResponse = await axios.get('http://localhost:11434/api/tags', { 
        timeout: 5000,
        validateStatus: (status) => status === 200
      });
      
      console.log(`✅ [OLLAMA TEST] Models endpoint responded: ${modelsResponse.status}`);
      
      if (modelsResponse.data && modelsResponse.data.models) {
        models = modelsResponse.data.models.map(m => m.name);
        ollamaStatus = true;
        console.log(`📋 [OLLAMA TEST] Found ${models.length} models: ${models.join(', ')}`);
      }
      
    } catch (modelsErr) {
      console.log(`❌ [OLLAMA TEST] Models endpoint failed: ${modelsErr.message}`);
      
      // Fallback: try ping endpoint (some versions respond differently)
      try {
        const pingResponse = await axios.get('http://localhost:11434/api/ping', { 
          timeout: 3000,
          validateStatus: () => true // Accept any status
        });
        
        console.log(`🔍 [OLLAMA TEST] Ping response: ${pingResponse.status}`);
        
        // Some Ollama versions return 404 for ping but are actually running
        if (pingResponse.status === 404) {
          console.log(`⚠️  [OLLAMA TEST] Got 404 for ping - Ollama might be running but ping endpoint not available`);
          // Try a different approach - attempt to make a simple model request
          try {
            const testResponse = await axios.get('http://localhost:11434/api/tags', { timeout: 3000 });
            if (testResponse.data) {
              ollamaStatus = true;
              models = testResponse.data.models ? testResponse.data.models.map(m => m.name) : [];
              console.log(`✅ [OLLAMA TEST] Connected via alternative route`);
            }
          } catch (altErr) {
            console.log(`❌ [OLLAMA TEST] Alternative connection also failed: ${altErr.message}`);
          }
        } else if (pingResponse.status === 200) {
          ollamaStatus = true;
          console.log(`✅ [OLLAMA TEST] Ping successful`);
        }
        
      } catch (pingErr) {
        console.log(`❌ [OLLAMA TEST] Both models and ping endpoints failed`);
        errorMessage = `Cannot connect to Ollama on localhost:11434. ${pingErr.message}`;
      }
    }
    
    if (!ollamaStatus) {
      errorMessage = errorMessage || 'Ollama service appears to be not running or not accessible on port 11434';
      console.log('💡 [OLLAMA TEST] Troubleshooting tips:');
      console.log('   1. Check if Ollama is running: ps aux | grep ollama');
      console.log('   2. Start Ollama service: ollama serve');
      console.log('   3. Check port: lsof -i :11434');
      console.log('   4. Test manually: curl http://localhost:11434/api/tags');
    }
    
    return res.json({ 
      running: ollamaStatus,
      models: models,
      error: ollamaStatus ? null : errorMessage,
      phiAvailable: models.some(m => m.includes('phi')),
      debug: {
        modelsEndpointWorking: models.length > 0,
        totalModels: models.length
      }
    });
    
  } catch (err) {
    console.log(`❌ [OLLAMA TEST] Unexpected error: ${err.message}`);
    return res.json({ 
      running: false, 
      error: `Test failed: ${err.message}`,
      models: []
    });
  }
});

/**
 * POST /api/enhance - Enhance raw title & description using Ollama chat if available, else fallback
 */
app.post('/api/enhance', async (req, res) => {
  const { title, description, model } = req.body || {};
  if (!title && !description) {
    return res.status(400).json({ error: 'Missing title or description' });
  }

  console.log('\n🚀 [ENHANCE REQUEST] Starting enhancement process...');
  console.log(`   📝 Title: "${(title || '').substring(0, 50)}${(title?.length || 0) > 50 ? '...' : ''}"`);
  console.log(`   📝 Description: "${description.substring(0, 50)}${description.length > 50 ? '...' : ''}"`);

  // Try to use provided model or auto-detect from available models
  let modelName = model || process.env.OLLAMA_MODEL;
  let ollamaResult = null;
  let errorMessage = null;

  if (!modelName) {
    console.log(`\n🔍 [OLLAMA] No model specified, auto-detecting available models...`);
    // Try to get available models
    try {
      const modelsResp = await axios.get('http://localhost:11434/api/tags', { timeout: 3000 });
      if (modelsResp && modelsResp.data.models && modelsResp.data.models.length > 0) {
        modelName = modelsResp.data.models[0].name;
        console.log(`   ✅ Auto-selected model: "${modelName}"`);
      } else {
        console.log(`   ❌ No models found in Ollama`);
        errorMessage = 'No Ollama models installed. Please run: ollama pull phi';
      }
    } catch (err) {
      console.log(`   ❌ Failed to detect models: ${err.message}`);
      errorMessage = `Cannot connect to Ollama: ${err.message}`;
    }
  }

  if (modelName && !errorMessage) {
    console.log(`\n🤖 [OLLAMA] Attempting to call Ollama with model: "${modelName}"...`);
    try {
      ollamaResult = await callOllama(modelName, title, description);
    } catch (ollamaError) {
      console.log(`❌ [OLLAMA ERROR] ${ollamaError.message}`);
      errorMessage = ollamaError.message;
    }
  }

  if (ollamaResult) {
    console.log('✅ [OLLAMA SUCCESS] Model responded successfully');
    
    // Try to parse JSON from the response
    try {
      // Robust JSON parsing with multiple fallback strategies
      let jsonStr = ollamaResult.trim();
      
      console.log(`🔍 [JSON DEBUG] Raw response length: ${jsonStr.length}`);
      console.log(`🔍 [JSON DEBUG] First 200 chars: ${jsonStr.substring(0, 200)}`);
      console.log(`🔍 [JSON DEBUG] Last 100 chars: ${jsonStr.substring(Math.max(0, jsonStr.length - 100))}`);
      
      // Remove any leading/trailing non-JSON text
      jsonStr = jsonStr.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // Remove markdown code blocks if present
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }
      
      // Try to extract JSON object if wrapped in other text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      // Handle incomplete JSON - try to complete it
      if (!jsonStr.endsWith('}')) {
        console.log(`⚠️ [JSON REPAIR] Incomplete JSON detected, attempting repair...`);
        
        // Count braces to see if we need to close
        const openBraces = (jsonStr.match(/\{/g) || []).length;
        const closeBraces = (jsonStr.match(/\}/g) || []).length;
        const missingBraces = openBraces - closeBraces;
        
        if (missingBraces > 0) {
          jsonStr += '}';
          console.log(`🔧 [JSON REPAIR] Added ${missingBraces} closing brace(s)`);
        }
        
        // If description seems incomplete, try to close the quote
        if (jsonStr.includes('"description"') && !jsonStr.includes('"}')) {
          if (jsonStr.match(/"description"\s*:\s*"[^"]*$/)) {
            jsonStr = jsonStr.replace(/"description"\s*:\s*"([^"]*).?$/, '"description":"$1"}');
            console.log(`🔧 [JSON REPAIR] Closed incomplete description`);
          }
        }
      }
      
      // Clean up newlines and escape sequences BEFORE attempting JSON parse
      jsonStr = jsonStr
        .replace(/"""/g, '"')                   // Fix triple quotes (common AI mistake)
        .replace(/\\"\\"/g, '\\"')              // Fix double escaped quotes
        .replace(/"([^"]*?)\n/g, '"$1\\n')      // Escape unescaped newlines in string values
        .replace(/\n([^"]*?)"/g, '\\n$1"')      // Escape unescaped newlines before closing quotes
        .replace(/\n/g, '\\n')                  // Escape any remaining newlines
        .replace(/\t/g, '\\t')                  // Escape tabs
        .replace(/\r/g, '\\r')                  // Escape carriage returns
        .replace(/\\\\n/g, '\\n')               // Fix double-escaped newlines
        .replace(/\\\\\\\\/g, '\\\\')           // Fix escaped backslashes
        .replace(/"/g, '"')                     // Normalize quotes
        .replace(/"/g, '"')                     // Normalize smart quotes
        .replace(/,\s*}/g, '}')                 // Remove trailing commas before closing braces
        .replace(/,\s*]/g, ']');                // Remove trailing commas before closing brackets

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        console.log(`❌ [JSON PARSE] Primary parsing failed: ${parseError.message}`);
        
        // Last resort: try to extract title and description manually
        const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
        const descMatch = jsonStr.match(/"description"\s*:\s*"([^"]+(?:\\n[^"]*)*)/);
        
        // If no match with standard quotes, try with triple quotes or other patterns
        let title = null;
        let description = null;
        
        if (titleMatch) {
          title = titleMatch[1];
        } else {
          // Try alternative patterns
          const altTitleMatch = jsonStr.match(/"title"\s*:\s*"""([^"]+)"""/);
          if (altTitleMatch) title = altTitleMatch[1];
        }
        
        if (descMatch) {
          description = descMatch[1];
        } else {
          // Try alternative patterns for description
          const altDescMatch = jsonStr.match(/"description"\s*:\s*"""([^"]+(?:[^"]*)*)/);
          if (altDescMatch) description = altDescMatch[1];
        }
        
        if (title && description) {
          console.log(`🔧 [JSON REPAIR] Manual extraction successful`);
          parsed = {
            title: title.replace(/\\n/g, '\n'),
            description: description.replace(/\\n/g, '\n')
          };
        } else {
          console.log(`❌ [JSON REPAIR] Manual extraction failed - title: ${!!title}, description: ${!!description}`);
          throw new Error(`Failed to parse or repair JSON: ${parseError.message}`);
        }
      }
      
      // Ensure we have valid title and description
      if (!parsed.title || !parsed.description) {
        throw new Error('Missing title or description in AI response');
      }
      
      // Clean the description to remove any remaining formatting artifacts
      let cleanDescription = parsed.description
        .replace(/<[^>]*>/g, '')                    // Remove all HTML tags
        .replace(/&nbsp;/g, ' ')                    // Remove HTML entities
        .replace(/&amp;/g, '&')                     // Fix ampersands
        .replace(/&lt;/g, '<')                      // Fix less than
        .replace(/&gt;/g, '>')                      // Fix greater than
        .replace(/\s{3,}/g, '\n\n')                 // Convert multiple spaces to paragraphs
        .replace(/\n{3,}/g, '\n\n')                 // Limit consecutive newlines
        .replace(/^(User Story|Description|Acceptance Criteria)\s*$/gim, (match) => match + '\n') // Ensure headers have line breaks
        .trim();
      
      // Clean the title to ensure it's complete and properly formatted
      let cleanTitle = parsed.title
        .replace(/<[^>]*>/g, '')                    // Remove HTML tags
        .replace(/\s+/g, ' ')                       // Normalize spaces
        .trim();
      
      console.log(`✅ [JSON SUCCESS] Successfully parsed and cleaned response`);
      console.log(`      Title: "${cleanTitle}"`);
      console.log(`      Description length: ${cleanDescription.length} characters`);
      
      return res.json({
        enhancedTitle: cleanTitle,
        enhancedDescription: cleanDescription,
        originalInput: description,
        suggestedType: analyzeIssueType(description),
        source: 'ollama-ai',
      });
    } catch (parseErr) {
      console.log(`   ⚠️  [OLLAMA] Failed to parse JSON: ${parseErr.message}`);
      console.log(`      Raw response length: ${ollamaResult.length} characters`);
      console.log(`      Raw response preview: "${ollamaResult.substring(0, 200)}..."`);
      
      // Use fallback rewriter to generate proper title and format the raw response
      const fallback = fallbackRewriter(title || '', description || '');
      
      // Try to clean up the raw response for better display
      let cleanedResponse = ollamaResult
        .replace(/^[^{]*\{/, '')  // Remove text before first {
        .replace(/\}[^}]*$/, '')  // Remove text after last }
        .replace(/\\n/g, '\n')     // Fix escaped newlines
        .replace(/\\"/g, '"')     // Fix escaped quotes
        .trim();
      
      // If the cleaned response looks like it might be a description, use it
      if (cleanedResponse.length > 100 && !cleanedResponse.startsWith('{')) {
        return res.json({
          enhancedTitle: fallback.enhancedTitle,
          enhancedDescription: cleanedResponse,
          originalInput: description,
          suggestedType: fallback.suggestedType,
          source: 'ollama-raw-cleaned',
        });
      } else {
        // Use full fallback
        return res.json({
          enhancedTitle: fallback.enhancedTitle,
          enhancedDescription: fallback.enhancedDescription,
          originalInput: description,
          suggestedType: fallback.suggestedType,
          source: 'fallback-rewriter',
        });
      }
    }
  }

  console.log('❌ [OLLAMA FAILED] Ollama not available, using fallback rewriter');
  if (errorMessage) {
    console.log(`   Error details: ${errorMessage}`);
    console.log(`   💡 To enable AI features:`);
    console.log(`      1. Install Ollama: https://ollama.ai`);
    console.log(`      2. Start service: ollama serve`);
    console.log(`      3. Install model: ollama pull phi:latest`);
  }
  
  // Fallback enhancement
  const fallback = fallbackRewriter(title || '', description || '');
  console.log(`   ✨ Fallback applied - Title: "${fallback.enhancedTitle}"`);
  console.log(`   ✨ Fallback applied - Description: "${fallback.enhancedDescription.substring(0, 80)}..."`);
  
  return res.json({ 
    ...fallback, 
    originalInput: description,
    source: 'fallback',
    warning: errorMessage || 'Ollama AI not available, used basic enhancement'
  });
});

/**
 * POST /api/config - Save Jira configuration
 */
app.post('/api/config', async (req, res) => {
  const { domain, email, apiToken } = req.body;

  if (!domain || !email || !apiToken) {
    return res.status(400).json({ error: 'Missing domain, email, or apiToken' });
  }

  currentConfig = { domain, email, apiToken };

  // Validate the config
  const isValid = await validateJiraConfig(currentConfig);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid Jira credentials or configuration' });
  }

  res.json({ success: true, message: 'Configuration saved and validated' });
});

/**
 * GET /api/config - Get current configuration (without token)
 */
app.get('/api/config', (req, res) => {
  res.json({
    domain: currentConfig.domain,
    email: currentConfig.email,
    hasToken: !!currentConfig.apiToken,
  });
});

/**
 * POST /api/validate - Validate current configuration
 */
app.post('/api/validate', async (req, res) => {
  if (!currentConfig.domain || !currentConfig.email || !currentConfig.apiToken) {
    return res.status(400).json({ error: 'Configuration not set. Please configure first.' });
  }

  const isValid = await validateJiraConfig(currentConfig);
  res.json({ valid: isValid });
});

/**
 * GET /api/projects - Get user's accessible projects
 */
app.get('/api/projects', async (req, res) => {
  if (!currentConfig.domain || !currentConfig.email || !currentConfig.apiToken) {
    return res.status(400).json({ error: 'Configuration not set' });
  }

  try {
    const projects = await getUserProjects(currentConfig);
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/issue-types - Get available issue types for a project
 */
app.get('/api/issue-types/:projectKey', async (req, res) => {
  const { projectKey } = req.params;

  if (!currentConfig.domain || !currentConfig.email || !currentConfig.apiToken) {
    return res.status(400).json({ error: 'Configuration not set' });
  }

  try {
    const issueTypes = await getIssueTypes(currentConfig, projectKey);
    res.json({ issueTypes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/create-issue - Create a new Jira issue
 */
app.post('/api/create-issue', async (req, res) => {
  const { projectKey, summary, description, issueType, originalInput } = req.body;

  if (!projectKey || !summary || !description || !issueType) {
    return res.status(400).json({ error: 'Missing required fields: projectKey, summary, description, issueType' });
  }

  if (!currentConfig.domain || !currentConfig.email || !currentConfig.apiToken) {
    return res.status(400).json({ error: 'Jira configuration not set' });
  }

  try {
    console.log('\n📦 [JIRA CREATION] Creating issue with enhanced content...');
    
    const issue = await createJiraIssue(currentConfig, {
      projectKey,
      summary,
      description,
      issueType,
    });

    console.log(`✅ [JIRA CREATION] Issue created: ${issue.key}`);

    // Add original input as comment if provided
    if (originalInput && originalInput.trim()) {
      console.log('📝 [JIRA COMMENT] Adding original input as comment...');
      
      const commentText = `Original User Input:\n\n${originalInput.trim()}`;
      
      try {
        await addCommentToIssue(currentConfig, issue.key, commentText);
        console.log(`✅ [JIRA COMMENT] Comment added successfully`);
      } catch (commentError) {
        console.error(`⚠️  [JIRA COMMENT] Failed to add comment: ${commentError.message}`);
        // Don't fail the entire request if comment fails
      }
    }

    res.json({
      success: true,
      issue: {
        key: issue.key,
        id: issue.id,
        url: issue.url,
      },
    });
  } catch (error) {
    console.error('❌ [JIRA CREATION] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         JIRA Standalone Web App                                ║
║                                                                ║
║  🌐 Open your browser and go to:                              ║
║     http://localhost:${PORT}                                     ║
║                                                                ║
║  ✅ Configure your Jira credentials                            ║
║  📝 Create and manage issues                                   ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
