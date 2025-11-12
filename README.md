# Jira Standalone

Free, open-source tool to create and manage Jira issues without Office Add-ins.

**Features:**
- ✅ Web UI (no Office required)
- ✅ CLI tool (command-line interface)
- ✅ 100% free and open-source
- ✅ Uses Jira REST API v3
- ✅ Works on your local machine

## Quick Start

### 1. Get a Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token (you'll use it to configure the app)

### 2. Install Dependencies

```bash
cd jira-standalone
npm install
```

### 3. Run the Web Server

```bash
npm start
```

Open your browser: **http://localhost:3001**

### 4. Configure Jira

- Go to the "Configure" tab
- Enter your Jira domain (e.g., "acme" for acme.atlassian.net)
- Enter your Atlassian email
- Paste your API token
- Click "Save & Validate"

### 5. Create Issues

- Go to the "Create Issue" tab
- Enter project key, summary, description, issue type
- Click "Create Issue"
- Get a direct link to your new issue!

---

## CLI Usage

Create issues from the command line (no browser needed).

### Validate Configuration

```bash
node src/cli.js validate --domain=acme --email=you@atlassian.com --token=your_token
```

### Create an Issue

```bash
node src/cli.js create \
  --domain=acme \
  --email=you@atlassian.com \
  --token=your_token \
  --project=PROJ \
  --summary="Fix login bug" \
  --description="Users cannot log in with SSO" \
  --type=Bug
```

### List Available Issue Types

```bash
node src/cli.js list-types --domain=acme --email=you@atlassian.com --token=your_token --project=PROJ
```

---

## File Structure

```
jira-standalone/
├── src/
│   ├── jiraService.js    # Jira API client (reusable)
│   ├── server.js         # Express web server
│   └── cli.js            # Command-line tool
├── public/
│   └── index.html        # Web UI
├── package.json
└── README.md
```

---

## Environment Variables (Optional)

Instead of entering credentials in the UI each time, you can set environment variables:

```bash
set JIRA_DOMAIN=acme
set JIRA_EMAIL=you@atlassian.com
set JIRA_TOKEN=your_token
npm start
```

---

## Security Notes

- **API Token:** Never commit your token to git. It's kept in memory only (not stored on disk).
- **HTTPS:** For production use, deploy behind HTTPS/TLS.
- **Browser Storage:** Configuration is stored in memory. Refreshing the page clears it. Re-enter credentials if needed.

---

## Troubleshooting

### "Invalid Jira credentials"
- Check your domain, email, and token are correct
- Verify your token hasn't expired: https://id.atlassian.com/manage-profile/security/api-tokens
- Ensure your account has permission to create issues in the target project

### "Project not found"
- Verify the project key is correct (check in Jira: Settings → Project Details)
- Ensure your account has access to that project

### "Port 3001 already in use"
- Change the port: `PORT=3002 npm start`

---

## License

MIT - Free to use and modify

---

## Want to help?

- Report bugs or request features
- Contribute improvements
- Share with others!

---

Built with ❤️ for developers who want simple Jira tools.
