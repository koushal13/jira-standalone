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
const { createJiraIssue, validateJiraConfig, getIssueTypes } = require('./jiraService');
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
      const ping = await axios.get('http://localhost:11434/api/ping', { timeout: 2000 });
      console.log(`   ✅ Ollama ping successful (status: ${ping.status})`);
      ollamaReachable = true;
    } catch (pingErr) {
      console.log(`   ⚠️  Ping failed: ${pingErr.message}`);
      
      // Try to list models as alternative check
      try {
        const models = await axios.get('http://localhost:11434/api/tags', { timeout: 2000 });
        console.log(`   ✅ Models list successful, found ${models.data.models?.length || 0} models`);
        ollamaReachable = true;
      } catch (modelsErr) {
        console.log(`   ❌ Models list also failed: ${modelsErr.message}`);
        ollamaReachable = false;
      }
    }

    if (!ollamaReachable) {
      console.log(`   ❌ Ollama is NOT responding on localhost:11434`);
      console.log(`   💡 Make sure Ollama is running: ollama serve`);
      return null;
    }

    console.log(`   ✅ Successfully connected to Ollama`);

    // Construct the system prompt for story formatting
    const systemPrompt = `You are an expert Jira story writer. Your task is to:
1. Reformat the user input into a professional Jira user story
2. Rephrase and improve the wording significantly
3. Add proper structure with Context, Description, and Acceptance Criteria sections
4. Make the title action-oriented and concise
5. Expand the description with clear, professional language

Return ONLY valid JSON (no markdown, no code blocks, no extra text) with this exact structure:
{
  "title": "Concise, action-oriented title",
  "description": "Well-structured description with h3. headers for sections"
}`;

    const userMessage = `Title: ${title}
Description: ${description}

Please format this into a professional Jira user story with proper structure and significantly improved wording. Make it clear and professional.`;

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
        temperature: 0.7,
      },
      { timeout: 45000 }  // Increased timeout
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
    return null;
  } catch (err) {
    console.log(`\n❌ [OLLAMA HTTP ERROR] Request failed`);
    console.log(`   Error message: ${err.message}`);
    if (err.response) {
      console.log(`   HTTP Status: ${err.response.status}`);
      console.log(`   Response data: ${JSON.stringify(err.response.data).substring(0, 200)}`);
    } else if (err.code) {
      console.log(`   Error code: ${err.code}`);
    }
    console.log(`\n💡 Make sure Ollama is running:`);
    console.log(`   1. Start Ollama: ollama serve`);
    console.log(`   2. Pull a model: ollama pull mistral`);
    console.log(`   3. Check: http://localhost:11434/api/tags`);
    return null;
  }
}

function fallbackRewriter(title, description) {
  // Simple, deterministic rewriter: clean up whitespace, title-case title,
  // and create structured description with Context, Details, Acceptance Criteria.
  function titleCase(s) {
    return s
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/(^|\s)\S/g, (t) => t.toUpperCase());
  }

  const cleanedTitle = titleCase(title).slice(0, 140);

  // Clean up the description - remove duplicate headers and structure
  let cleanedDesc = description
    .replace(/h3\.\s*Context\s+h3\.\s*Context/gi, 'h3. Context')
    .replace(/h3\.\s*Details\s+h3\.\s*Details/gi, 'h3. Details')
    .replace(/h3\.\s*Acceptance\s+Criteria\s+h3\.\s*Acceptance\s+Criteria/gi, 'h3. Acceptance Criteria')
    .replace(/\n{2,}/g, '\n\n')
    .trim();

  // If description already has structure, clean it up
  if (cleanedDesc.includes('h3.')) {
    return { enhancedTitle: cleanedTitle, enhancedDescription: cleanedDesc };
  }

  // Otherwise, create structure
  const dedupDesc = description.replace(/\n{2,}/g, '\n\n').trim();
  const paragraphs = dedupDesc.split(/\n\n/).map((p) => p.trim()).filter(Boolean);
  const context = paragraphs[0] || 'No context provided';
  const details = paragraphs.slice(1).join('\n\n') || '';

  let enhancedDescription = `h3. Context\n${context}`;
  if (details) {
    enhancedDescription += `\n\nh3. Details\n${details}`;
  }
  enhancedDescription += `\n\nh3. Acceptance Criteria\n- Meets requirements\n- Tested and validated\n- Documentation updated`;

  console.log('📋 [Fallback Rewriter] Applied');
  return { enhancedTitle: cleanedTitle, enhancedDescription };
}

/**
 * GET /api/ollama-test - Test if Ollama is running
 */
app.get('/api/ollama-test', async (req, res) => {
  try {
    console.log('\n🔍 [OLLAMA TEST] Checking Ollama connection...');
    const ping = await axios.get('http://localhost:11434/api/ping', { timeout: 2000 }).catch(() => null);
    
    if (ping) {
      console.log('✅ [OLLAMA TEST] Ollama is running');
      const models = await axios.get('http://localhost:11434/api/tags', { timeout: 2000 }).catch(() => null);
      if (models && models.data.models) {
        console.log(`✅ [OLLAMA TEST] Found ${models.data.models.length} models`);
        const modelNames = models.data.models.map(m => m.name);
        return res.json({ 
          running: true, 
          models: modelNames 
        });
      }
      return res.json({ running: true, models: [] });
    } else {
      console.log('❌ [OLLAMA TEST] Ollama is not responding');
      return res.json({ running: false, error: 'Ollama not responding on localhost:11434' });
    }
  } catch (err) {
    console.log(`❌ [OLLAMA TEST] Error: ${err.message}`);
    return res.json({ running: false, error: err.message });
  }
});

/**
 * POST /api/enhance - Enhance raw title & description using Ollama chat if available, else fallback
 */
app.post('/api/enhance', async (req, res) => {
  const { title, description, model } = req.body || {};
  if (!title && !description) return res.status(400).json({ error: 'Missing title or description' });

  console.log('\n🚀 [ENHANCE REQUEST] Starting enhancement process...');
  console.log(`   📝 Title: "${(title || '').substring(0, 50)}${(title?.length || 0) > 50 ? '...' : ''}"`);
  console.log(`   📝 Description: "${description.substring(0, 50)}${description.length > 50 ? '...' : ''}"`);

  // Try to use provided model or auto-detect from available models
  let modelName = model || process.env.OLLAMA_MODEL;
  let ollamaResult = null;

  if (!modelName) {
    console.log(`\n🔍 [OLLAMA] No model specified, auto-detecting available models...`);
    // Try to get available models
    try {
      const modelsResp = await axios.get('http://localhost:11434/api/tags', { timeout: 2000 }).catch(() => null);
      if (modelsResp && modelsResp.data.models && modelsResp.data.models.length > 0) {
        modelName = modelsResp.data.models[0].name;
        console.log(`   ✅ Auto-selected model: "${modelName}"`);
      } else {
        console.log(`   ❌ No models found in Ollama`);
      }
    } catch (err) {
      console.log(`   ❌ Failed to detect models: ${err.message}`);
    }
  }

  if (modelName) {
    console.log(`\n🤖 [OLLAMA] Attempting to call Ollama with model: "${modelName}"...`);
    ollamaResult = await callOllama(modelName, title, description);
  }

  if (ollamaResult) {
    console.log('✅ [OLLAMA SUCCESS] Model responded successfully');
    
    // Try to parse JSON from the response
    try {
      // Sometimes the response might have markdown code blocks, so clean it
      let jsonStr = ollamaResult.trim();
      
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

      const parsed = JSON.parse(jsonStr);
      
      console.log(`   ✅ Successfully parsed JSON response`);
      console.log(`      Title: "${parsed.title}"`);
      console.log(`      Description: "${parsed.description.substring(0, 80)}..."`);
      
      return res.json({
        enhancedTitle: parsed.title || title,
        enhancedDescription: parsed.description || description,
        source: 'ollama',
      });
    } catch (parseErr) {
      console.log(`   ⚠️  [OLLAMA] Failed to parse JSON: ${parseErr.message}`);
      console.log(`      Raw response: "${ollamaResult.substring(0, 100)}..."`);
      
      // If not JSON, treat the entire response as enhanced description
      return res.json({
        enhancedTitle: title,
        enhancedDescription: ollamaResult,
        source: 'ollama-raw',
      });
    }
  }

  console.log('❌ [OLLAMA FAILED] Ollama not available, using fallback rewriter');
  // Fallback
  const fallback = fallbackRewriter(title || '', description || '');
  console.log(`   ✨ Fallback applied - Title: "${fallback.enhancedTitle}"`);
  console.log(`   ✨ Fallback applied - Description: "${fallback.enhancedDescription.substring(0, 80)}..."`);
  return res.json({ ...fallback, source: 'fallback' });
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
  const { projectKey, summary, description, issueType } = req.body;

  if (!projectKey || !summary || !description || !issueType) {
    return res.status(400).json({ error: 'Missing required fields: projectKey, summary, description, issueType' });
  }

  if (!currentConfig.domain || !currentConfig.email || !currentConfig.apiToken) {
    return res.status(400).json({ error: 'Jira configuration not set' });
  }

  try {
    const issue = await createJiraIssue(currentConfig, {
      projectKey,
      summary,
      description,
      issueType,
    });

    res.json({
      success: true,
      issue: {
        key: issue.key,
        id: issue.id,
        url: issue.url,
      },
    });
  } catch (error) {
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
