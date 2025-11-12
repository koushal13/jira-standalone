#!/usr/bin/env node

/**
 * System & Ollama Diagnostics
 * Run: node system-check.js
 */

const axios = require('axios');
const os = require('os');

async function checkSystem() {
  console.log('🖥️  SYSTEM INFORMATION\n');
  
  // Total memory
  const totalMem = os.totalmem() / (1024 * 1024 * 1024);
  const freeMem = os.freemem() / (1024 * 1024 * 1024);
  const usedMem = totalMem - freeMem;
  
  console.log(`Total Memory: ${totalMem.toFixed(2)} GB`);
  console.log(`Used Memory: ${usedMem.toFixed(2)} GB`);
  console.log(`Free Memory: ${freeMem.toFixed(2)} GB`);
  console.log(`CPU Cores: ${os.cpus().length}`);
  console.log(`Platform: ${os.platform()}`);
  
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🤖 OLLAMA MODELS\n');

  try {
    const response = await axios.get('http://localhost:11434/api/tags', { timeout: 3000 });
    
    if (response.data.models && response.data.models.length > 0) {
      console.log(`Found ${response.data.models.length} model(s):\n`);
      response.data.models.forEach((model) => {
        const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(2);
        console.log(`📌 ${model.name}`);
        console.log(`   Size: ${sizeGB} GB`);
        
        // Estimate system requirements
        if (sizeGB < 2.5) {
          console.log(`   Memory Required: ~${(parseFloat(sizeGB) * 1.5).toFixed(1)} GB ✅ LIGHTWEIGHT`);
        } else if (sizeGB < 4) {
          console.log(`   Memory Required: ~${(parseFloat(sizeGB) * 1.5).toFixed(1)} GB ⚠️  MEDIUM`);
        } else {
          console.log(`   Memory Required: ~${(parseFloat(sizeGB) * 1.5).toFixed(1)} GB ❌ HEAVY`);
        }
        console.log('');
      });
    } else {
      console.log('❌ No models found!');
    }
  } catch (err) {
    console.log('❌ Cannot connect to Ollama');
    console.log(`   Error: ${err.message}`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('💡 RECOMMENDATIONS\n');
  
  if (freeMem < 2) {
    console.log('⚠️  LOW MEMORY WARNING: Less than 2GB available');
    console.log('   - Close other applications');
    console.log('   - Use the smallest available model');
  } else if (freeMem < 4) {
    console.log('ℹ️  MEDIUM MEMORY: 2-4GB available');
    console.log('   - Use models < 2.5GB (orca-mini, phi)');
  } else {
    console.log('✅ GOOD MEMORY: 4GB+ available');
    console.log('   - Can use most models');
  }
  
  console.log('\n');
}

checkSystem();
