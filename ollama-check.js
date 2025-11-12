#!/usr/bin/env node

/**
 * Quick Ollama Diagnostics
 * Run: node ollama-check.js
 */

const axios = require('axios');

async function checkOllama() {
  console.log('🔍 Checking Ollama...\n');

  try {
    // Check if Ollama is running
    const ping = await axios.get('http://localhost:11434/api/ping', { timeout: 2000 }).catch(() => null);
    if (ping) {
      console.log('✅ Ollama server is running');
    }

    // Get list of available models
    console.log('\n📦 Checking available models...');
    const response = await axios.get('http://localhost:11434/api/tags', { timeout: 3000 });
    
    if (response.data.models && response.data.models.length > 0) {
      console.log(`✅ Found ${response.data.models.length} model(s):\n`);
      response.data.models.forEach((model) => {
        console.log(`   📌 ${model.name}`);
        console.log(`      Size: ${(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB`);
        console.log(`      Modified: ${new Date(model.modified_at).toLocaleString()}\n`);
      });
    } else {
      console.log('❌ No models found!');
      console.log('\n💡 To download a model, run:');
      console.log('   ollama pull mistral');
      console.log('   ollama pull neural-chat');
      console.log('   ollama pull orca-mini');
      console.log('   ollama pull llama2');
    }
  } catch (err) {
    console.log('❌ Error checking Ollama:');
    console.log(`   ${err.message}`);
    console.log('\n💡 Make sure Ollama is running:');
    console.log('   ollama serve');
  }
}

checkOllama();
