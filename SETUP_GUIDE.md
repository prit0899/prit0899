# Portfolio Automation Setup Guide

This GitHub Action automatically updates your portfolio README with rich project data by reading metadata from each of your repos.

## Architecture

```
Portfolio Repo (this action)
      │
      ├─→ Fetch all your repos from GitHub API
      │
      ├─→ For each repo:
      │    ├─ Try to read portfolio.yml
      │    ├─ If not found, detect dependencies (package.json, Podfile, etc.)
      │    └─ Fall back to GitHub API data
      │
      └─→ Generate rich README with project cards
```

## Setup Steps

### 1. In Your Portfolio Repo

#### Copy these files:
```
.github/workflows/update-portfolio.yml    → Your portfolio repo
scripts/update-projects.mjs               → Your portfolio repo
```

#### Edit `update-portfolio.yml`:
Replace `your-github-username` with your actual GitHub username:
```yaml
env:
  GH_USERNAME: yourusername
```

#### Add markers to your README.md:
Put these lines where you want your projects to appear:
```markdown
<!-- PROJECTS:START -->
<!-- PROJECTS:END -->
```

#### Update Node version in the workflow (to fix deprecation warnings):
The workflow already sets Node 24. If you still see warnings, clear Actions cache from repo settings.

### 2. In Each Project Repo

#### Option A: Add `portfolio.yml` (Recommended)

Copy the template file `portfolio.yml` to the **root** of each project repo, customize it:

```yaml
title: "My Awesome Project"
description: "What this project does"

stack:
  - React
  - Node.js
  - MongoDB
  - Firebase

tools:
  - VS Code
  - GitHub Actions
  - Figma

features:
  - Real-time updates
  - Authentication
  - Analytics
  - Mobile responsive

status: "Active"      # or: Completed, Archived, In Development
featured: true        # Set to true for your best projects
```

#### Option B: Just Use GitHub API (No Manual Work)

If you don't add `portfolio.yml`, the action will:
- Detect your repo description
- Auto-detect languages from `package.json`, `Podfile`, `requirements.txt`, etc.
- Use GitHub topics as tags
- Fall back to whatever GitHub knows

This is fine but less detailed.

### 3. Trigger the Action

#### Manual Trigger
1. Go to your portfolio repo's **Actions** tab
2. Select **Update Portfolio Projects**
3. Click **Run workflow**

#### Automatic Schedule
The action runs daily at 6:00 AM UTC. Change the cron in `.github/workflows/update-portfolio.yml`:

```yaml
schedule:
  - cron: "0 6 * * *"   # Every day at 06:00 UTC
  # Examples:
  # "0 * * * *"        # Every hour
  # "0 12 * * *"       # Daily at noon UTC
  # "0 6 * * MON"      # Every Monday at 6 AM
```

#### Instant Updates (Optional)
To update your portfolio **immediately** when you push to a project repo:

1. Create a **fine-grained personal access token** (Settings → Developer settings → Personal access tokens):
   - Only grant **Contents** read access
   - Only on your portfolio repo
   - No expiration (or set it to your preferred interval)

2. In each project repo, add the token as a secret:
   - Go to **Settings → Secrets and variables → Actions**
   - Create `PORTFOLIO_DISPATCH_TOKEN`
   - Paste your token

3. Copy `.github/workflows/notify-portfolio.yml` to each project repo

4. Edit it with your portfolio repo URL:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer ${{ secrets.PORTFOLIO_DISPATCH_TOKEN }}" \
     https://api.github.com/repos/YOUR_USERNAME/YOUR_PORTFOLIO_REPO/dispatches \
     -d '{"event_type":"project_updated"}'
   ```

---

## What Gets Generated

The action creates rich project cards like:

```markdown
### Expense Tracker

AI-powered expense manager with OCR and cloud sync.

**Tech Stack:** Swift, SwiftUI, Firebase, FastAPI, OpenAI

**Tools:** Xcode, GitHub Actions, Figma

**Features:** ✓ OCR Bill Recognition | ✓ AI Categorization | ✓ PDF Export | ✓ Cloud Sync

**Status:** Active | **Updated:** 2024-01-15
```

Featured projects appear first. All projects are sorted by most recently updated.

---

## Customization

### Add Custom Logos/Icons
Edit `scripts/update-projects.mjs` to add badges:

```javascript
function renderCard(p) {
  const icons = {
    'Swift': '🍎',
    'React': '⚛️',
    'Firebase': '🔥',
    // ... add more
  };
  // Use in rendering...
}
```

### Filter Out Repos
In `scripts/update-projects.mjs`, the `filtered` array excludes forks, archived repos, and your portfolio repo. Add more filters:

```javascript
const filtered = repos.filter(
  (r) => !r.fork 
    && !r.archived 
    && r.name !== portfolioName
    && !r.name.startsWith("test-")   // Exclude test repos
    && r.stargazers_count > 0         // Only repos with stars
);
```

### Use YAML Parser
The script includes a basic YAML parser. For better parsing, install the `yaml` package:

```bash
npm install yaml
```

Then import it at the top:
```javascript
import YAML from 'yaml';
```

---

## Troubleshooting

### Action fails with "Could not find markers"
Make sure your README.md has:
```markdown
<!-- PROJECTS:START -->
<!-- PROJECTS:END -->
```

### Projects not updating
1. Check **Actions** tab for errors
2. Verify `GH_USERNAME` in workflow matches your username
3. Make sure your project repos are public (GITHUB_TOKEN only sees public repos by default)
4. Run manually to see error messages

### Token/Permission Issues
If you get auth errors:
1. The default `GITHUB_TOKEN` in the workflow is usually sufficient
2. For private repos, you'd need a PAT with `repo` scope
3. For dispatch tokens, use fine-grained PATs with minimum permissions

### Dependencies Not Detected
Auto-detection only works for common files:
- `package.json` (Node.js)
- `Podfile.lock` (iOS)
- `requirements.txt` (Python)
- `Gemfile.lock` (Ruby)
- (Add more in `scripts/update-projects.mjs`)

For other ecosystems, add `portfolio.yml` manually.

---

## Example Portfolio.yml Files

### Swift/iOS App
```yaml
title: "MyApp"
description: "iOS app with real-time updates"
stack:
  - Swift
  - SwiftUI
  - Combine
  - CoreData
  - Firebase
  - RevenueCat
tools:
  - Xcode
  - GitHub Actions
  - Firebase Console
features:
  - Real-time Sync
  - Offline Support
  - Premium Tiers
  - Dark Mode
status: "Active"
featured: true
```

### Full-Stack Web App
```yaml
title: "Dashboard"
description: "Analytics dashboard with real-time data"
stack:
  - React
  - TypeScript
  - Next.js
  - Tailwind CSS
  - PostgreSQL
  - Redis
tools:
  - VS Code
  - GitHub Actions
  - Vercel
  - DataDog
features:
  - Real-time Charts
  - Custom Reports
  - User Permissions
  - Email Alerts
status: "Active"
featured: true
```

### Python Backend
```yaml
title: "API Server"
description: "FastAPI backend with async workers"
stack:
  - Python
  - FastAPI
  - PostgreSQL
  - Celery
  - Docker
tools:
  - PyCharm
  - Docker Desktop
  - GitHub Actions
features:
  - REST API
  - Background Jobs
  - Database Migrations
  - API Docs
status: "Completed"
featured: false
```

---

## Files Reference

| File | Location | Purpose |
|------|----------|---------|
| `update-portfolio.yml` | `.github/workflows/` | Main workflow (schedule, dispatch) |
| `notify-portfolio.yml` | `.github/workflows/` (in each project) | Optional: triggers portfolio on push |
| `update-projects.mjs` | `scripts/` | Fetches repos, parses metadata, generates README |
| `portfolio.yml` | Root of each project repo | Project metadata (title, stack, features) |

---

## Advanced: Run Locally

Test the action locally before committing:

```bash
export GITHUB_TOKEN=ghp_your_token_here
export GH_USERNAME=yourusername
export GITHUB_REPOSITORY=yourusername/your-portfolio-repo

node scripts/update-projects.mjs
```

Check your README.md for updates.
