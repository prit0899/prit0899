# Quick Setup Checklist

## Portfolio Repo Setup (One-time)

- [ ] Copy `.github/workflows/update-portfolio.yml` to your portfolio repo
- [ ] Copy `scripts/update-projects.mjs` to your portfolio repo
- [ ] Open `update-portfolio.yml` and change `your-github-username` to your actual username
- [ ] Open your README.md and add markers where you want projects:
  ```
  <!-- PROJECTS:START -->
  <!-- PROJECTS:END -->
  ```
- [ ] Commit and push everything
- [ ] Go to **Actions** tab and manually run **Update Portfolio Projects** to test
- [ ] Check your README.md — you should see a projects section

## For Each Project Repo

### Quick Version (GitHub API Only)
Just make sure your repo has:
- [ ] A good description
- [ ] GitHub topics set (`Settings → Topics`)

### Detailed Version (Recommended)
- [ ] Copy `portfolio.yml` to the root of the repo
- [ ] Edit it with:
  - [ ] Project title
  - [ ] Description
  - [ ] Tech stack list
  - [ ] Tools used
  - [ ] Key features
  - [ ] Status (Active/Completed/etc)
  - [ ] Set `featured: true` for your best projects
- [ ] Commit and push

## Enable Instant Updates (Optional)

If you want the portfolio to update immediately when you push to a project:

- [ ] Create a fine-grained PAT at `github.com/settings/personal-access-tokens/new`
  - [ ] Name it something like "Portfolio Dispatch"
  - [ ] Set expiration (or leave blank for no expiration)
  - [ ] Resource owner: your account
  - [ ] Permissions: `Contents` (read-only)
  - [ ] Repository access: `Only select repositories` → your portfolio repo
  - [ ] Click "Generate token"
  - [ ] Copy the token (you'll only see it once)

- [ ] In EACH project repo:
  - [ ] Go to `Settings → Secrets and variables → Actions`
  - [ ] Create a new secret called `PORTFOLIO_DISPATCH_TOKEN`
  - [ ] Paste the token
  - [ ] Copy `.github/workflows/notify-portfolio.yml` to `.github/workflows/`
  - [ ] Edit it with your portfolio repo URL:
    ```yaml
    https://api.github.com/repos/YOUR_USERNAME/YOUR_PORTFOLIO_REPO/dispatches
    ```

## Test It

- [ ] Make a small change to a `portfolio.yml` in one project
- [ ] Commit and push
- [ ] If you set up instant updates, watch your portfolio repo's Actions tab
- [ ] Should see a new workflow run called "Update Portfolio Projects"
- [ ] Wait 1-2 minutes
- [ ] Your portfolio README should update automatically

## Done!

Your portfolio now automatically stays in sync with your projects. ✨

---

## Troubleshooting

### "Could not find markers in README.md"
→ Add `<!-- PROJECTS:START -->` and `<!-- PROJECTS:END -->` to your portfolio README

### "Failed to fetch repositories"
→ Check that `GH_USERNAME` is correct and matches your actual GitHub username

### Nothing updated in README
→ Check the **Actions** tab for error messages. You might need to:
- [ ] Verify the GITHUB_TOKEN has access
- [ ] Make sure your project repos are public
- [ ] Clear the Actions cache in Settings

### portfolio.yml not being read
→ Make sure it's in the **root** of the project repo (same level as .gitignore)

### Dispatch token issues
→ Fine-grained PATs must have:
- [ ] Correct owner (your account)
- [ ] `Contents` permission (minimum)
- [ ] Access to the portfolio repo only
- [ ] Not expired
