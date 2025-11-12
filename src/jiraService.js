/**
 * JIRA API Service (Node.js version)
 * Handles all interactions with JIRA REST API v3
 */

const axios = require('axios');

/**
 * Create a Basic Auth header from email and API token
 */
function createAuthHeader(email, apiToken) {
  const credentials = `${email}:${apiToken}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Create a JIRA issue from email content
 * @param {Object} config - JIRA configuration (domain, email, apiToken)
 * @param {Object} payload - Issue creation data (projectKey, summary, description, issueType)
 * @returns {Promise<Object>} Created issue details (key and ID)
 */
async function createJiraIssue(config, payload) {
  if (!config.domain || !config.email || !config.apiToken) {
    throw new Error('JIRA configuration is incomplete. Please check your settings.');
  }

  const jiraEndpoint = `https://${config.domain}.atlassian.net/rest/api/3/issue`;

  const issuePayload = {
    fields: {
      project: {
        key: payload.projectKey,
      },
      summary: payload.summary,
      description: {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: payload.description,
              },
            ],
          },
        ],
      },
      issuetype: {
        name: payload.issueType,
      },
    },
  };

  try {
    const response = await axios.post(jiraEndpoint, issuePayload, {
      headers: {
        Authorization: createAuthHeader(config.email, config.apiToken),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return {
      key: response.data.key,
      id: response.data.id,
      url: `https://${config.domain}.atlassian.net/browse/${response.data.key}`,
    };
  } catch (error) {
    const errorData = error.response?.data;
    const errorMessages = errorData?.errorMessages || [];
    const errors = errorData?.errors || {};
    const errorMessage = errorMessages[0] || Object.values(errors)[0] || error.message || `JIRA error ${error.response?.status}`;
    
    // Log full error for debugging
    console.error('JIRA API Error Details:', {
      status: error.response?.status,
      errorMessages,
      errors,
      fullData: errorData,
    });
    
    throw new Error(`Failed to create JIRA issue: ${errorMessage}`);
  }
}

/**
 * Validate JIRA configuration by making a test API call
 */
async function validateJiraConfig(config) {
  try {
    const response = await axios.get(
      `https://${config.domain}.atlassian.net/rest/api/3/myself`,
      {
        headers: {
          Authorization: createAuthHeader(config.email, config.apiToken),
          Accept: 'application/json',
        },
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error('JIRA validation failed:', error.message);
    return false;
  }
}

/**
 * Get available issue types for a project
 */
async function getIssueTypes(config, projectKey) {
  try {
    const response = await axios.get(
      `https://${config.domain}.atlassian.net/rest/api/3/issuetype/search?projectKey=${projectKey}`,
      {
        headers: {
          Authorization: createAuthHeader(config.email, config.apiToken),
          Accept: 'application/json',
        },
      }
    );

    return response.data.values.map((issueType) => ({
      id: issueType.id,
      name: issueType.name,
    }));
  } catch (error) {
    console.error('Failed to fetch issue types:', error.message);
    return [];
  }
}

module.exports = {
  createJiraIssue,
  validateJiraConfig,
  getIssueTypes,
};
