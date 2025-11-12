#!/usr/bin/env node

/**
 * Standalone Jira CLI Tool
 * Create/update Jira issues from the command line
 *
 * Usage:
 *   node src/cli.js create --domain=acme --email=user@atlassian.com --token=xxx --project=PROJ --summary="Issue" --description="Desc" --type="Bug"
 *   node src/cli.js validate --domain=acme --email=user@atlassian.com --token=xxx
 */

const { createJiraIssue, validateJiraConfig, getIssueTypes } = require('./jiraService');

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const params = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      params[key] = value;
    }
  }

  return { command, params };
}

// Print usage
function printUsage() {
  console.log(`
JIRA Standalone CLI

USAGE:
  node src/cli.js <command> [options]

COMMANDS:

  validate
    Validate Jira credentials
    Options:
      --domain=<name>       Jira domain (e.g., acme for acme.atlassian.net)
      --email=<email>       Atlassian account email
      --token=<token>       Jira API token

  create
    Create a new Jira issue
    Options:
      --domain=<name>       Jira domain
      --email=<email>       Atlassian account email
      --token=<token>       Jira API token
      --project=<key>       Project key (e.g., PROJ)
      --summary=<text>      Issue summary (title)
      --description=<text>  Issue description
      --type=<type>         Issue type (e.g., Bug, Task, Story)

  list-types
    List available issue types for a project
    Options:
      --domain=<name>
      --email=<email>
      --token=<token>
      --project=<key>

EXAMPLES:

  Validate:
    node src/cli.js validate --domain=acme --email=you@atlassian.com --token=your_token_here

  Create Issue:
    node src/cli.js create --domain=acme --email=you@atlassian.com --token=token \\
      --project=PROJ --summary="Fix login bug" --description="Users can't login" --type=Bug

  List Issue Types:
    node src/cli.js list-types --domain=acme --email=you@atlassian.com --token=token --project=PROJ
  `);
}

// Validate command
async function cmdValidate(params) {
  const { domain, email, token } = params;

  if (!domain || !email || !token) {
    console.error('❌ Error: Missing required parameters: --domain, --email, --token');
    return false;
  }

  console.log('🔍 Validating Jira configuration...');
  const isValid = await validateJiraConfig({ domain, email, apiToken: token });

  if (isValid) {
    console.log('✅ Configuration is valid!');
    return true;
  } else {
    console.error('❌ Configuration is invalid. Check your credentials.');
    return false;
  }
}

// Create issue command
async function cmdCreate(params) {
  const { domain, email, token, project, summary, description, type } = params;

  if (!domain || !email || !token || !project || !summary || !description || !type) {
    console.error(
      '❌ Error: Missing required parameters. Need: --domain, --email, --token, --project, --summary, --description, --type'
    );
    return false;
  }

  console.log('📝 Creating Jira issue...');
  try {
    const issue = await createJiraIssue(
      { domain, email, apiToken: token },
      {
        projectKey: project,
        summary,
        description,
        issueType: type,
      }
    );

    console.log('✅ Issue created successfully!');
    console.log(`   Key: ${issue.key}`);
    console.log(`   ID: ${issue.id}`);
    console.log(`   URL: ${issue.url}`);
    return true;
  } catch (error) {
    console.error('❌ Error creating issue:', error.message);
    return false;
  }
}

// List issue types command
async function cmdListTypes(params) {
  const { domain, email, token, project } = params;

  if (!domain || !email || !token || !project) {
    console.error('❌ Error: Missing required parameters: --domain, --email, --token, --project');
    return false;
  }

  console.log(`🔍 Fetching issue types for project ${project}...`);
  try {
    const types = await getIssueTypes({ domain, email, apiToken: token }, project);

    if (types.length === 0) {
      console.log('ℹ️ No issue types found.');
      return true;
    }

    console.log('✅ Available issue types:');
    types.forEach((t) => console.log(`   - ${t.name} (ID: ${t.id})`));
    return true;
  } catch (error) {
    console.error('❌ Error fetching issue types:', error.message);
    return false;
  }
}

// Main
async function main() {
  const { command, params } = parseArgs();

  if (!command) {
    printUsage();
    process.exit(0);
  }

  let success = false;
  switch (command.toLowerCase()) {
    case 'validate':
      success = await cmdValidate(params);
      break;
    case 'create':
      success = await cmdCreate(params);
      break;
    case 'list-types':
      success = await cmdListTypes(params);
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
