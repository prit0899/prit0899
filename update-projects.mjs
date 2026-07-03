import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import YAML from "yaml";

const token = process.env.GITHUB_TOKEN;
const username = process.env.GH_USERNAME;
const portfolioRepo = process.env.GITHUB_REPOSITORY;

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
};

// Simple YAML parser fallback if yaml package not available
function parseYAML(content) {
  try {
    // Try to use the yaml package if installed
    return YAML.parse(content);
  } catch (e) {
    // Fallback: simple parsing for basic portfolio.yml structure
    const result = {};
    const lines = content.split("\n");
    let currentKey = null;
    let currentArray = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      if (line.startsWith("  - ")) {
        // Array item
        const value = trimmed.slice(2);
        if (currentArray) currentArray.push(value);
      } else if (line.includes(": ")) {
        // Key-value
        const [key, ...valueParts] = line.split(":");
        const value = valueParts.join(":").trim();
        if (value) {
          result[key.trim()] = value;
          currentArray = null;
        } else {
          currentKey = key.trim();
          result[currentKey] = [];
          currentArray = result[currentKey];
        }
      }
    }
    return result;
  }
}

async function ghFetch(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`GitHub API warning ${res.status} for ${url}`);
    return null;
  }
  return res.json();
}

async function getAllRepos() {
  let page = 1;
  const repos = [];
  while (true) {
    const batch = await ghFetch(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`
    );
    if (!batch || batch.length === 0) break;
    repos.push(...batch);
    page++;
  }
  return repos;
}

async function getPortfolioYML(repo) {
  try {
    const url = `https://raw.githubusercontent.com/${username}/${repo.name}/HEAD/portfolio.yml`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const content = await res.text();
    return parseYAML(content);
  } catch (e) {
    return null;
  }
}

async function detectDependencies(repo) {
  // Try to detect tech stack from common dependency files
  const detected = [];
  const filesToCheck = [
    { file: "package.json", parser: (c) => JSON.parse(c).dependencies || {} },
    { file: "Podfile.lock", parser: (c) => c.match(/- (\w+)/g) || [] },
    { file: "requirements.txt", parser: (c) => c.split("\n").filter(l => l.trim()) },
    { file: "Gemfile.lock", parser: (c) => c.match(/^    (\w+) \(/gm) || [] },
  ];

  for (const { file, parser } of filesToCheck) {
    try {
      const url = `https://raw.githubusercontent.com/${username}/${repo.name}/HEAD/${file}`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const content = await res.text();
        const deps = parser(content);
        if (typeof deps === "object" && !Array.isArray(deps)) {
          detected.push(...Object.keys(deps).slice(0, 3));
        } else if (Array.isArray(deps)) {
          detected.push(...deps.slice(0, 3));
        }
      }
    } catch (e) {
      // Ignore if file doesn't exist
    }
  }

  return [...new Set(detected)];
}

function fmtDate(iso) {
  return new Date(iso).toISOString().split("T")[0];
}

async function buildProjectData(repo) {
  const portfolio = await getPortfolioYML(repo);

  // If no portfolio.yml, fall back to GitHub API + auto-detection
  if (!portfolio) {
    const langs = await ghFetch(repo.languages_url);
    const detected = await detectDependencies(repo);
    const stack = detected.length > 0 ? detected.join(", ") : Object.keys(langs || {}).slice(0, 3).join(", ") || "—";

    return {
      name: repo.name,
      url: repo.html_url,
      description: (repo.description || "—").replace(/\|/g, "/"),
      stack,
      features: [],
      tools: [],
      status: "—",
      updated: fmtDate(repo.pushed_at),
    };
  }

  // Use portfolio.yml metadata
  const stack = (portfolio.stack || []).join(", ") || "—";
  const features = portfolio.features || [];
  const tools = portfolio.tools || [];

  return {
    name: portfolio.title || repo.name,
    repoName: repo.name,
    url: repo.html_url,
    description: portfolio.description || repo.description || "—",
    stack,
    features,
    tools,
    status: portfolio.status || "—",
    updated: fmtDate(repo.pushed_at),
    featured: portfolio.featured || false,
  };
}

function renderProjectCards(projects) {
  const featured = projects.filter((p) => p.featured).sort((a, b) => (a.updated < b.updated ? 1 : -1));
  const others = projects.filter((p) => !p.featured).sort((a, b) => (a.updated < b.updated ? 1 : -1));

  const sections = [];

  if (featured.length > 0) {
    sections.push("## Featured Projects\n");
    for (const p of featured) {
      sections.push(renderCard(p));
    }
  }

  sections.push("\n## All Projects\n");
  for (const p of others) {
    sections.push(renderCard(p));
  }

  return sections.join("\n");
}

function renderCard(p) {
  const features = p.features && p.features.length > 0
    ? `\n**Features:** ${p.features.map((f) => `✓ ${f}`).join(" | ")}`
    : "";

  const tools = p.tools && p.tools.length > 0
    ? `\n**Tools:** ${p.tools.join(", ")}`
    : "";

  return `
### [${p.name}](${p.url})

${p.description}

**Tech Stack:** ${p.stack}${tools}${features}

**Status:** ${p.status} | **Updated:** ${p.updated}

---
`;
}

async function main() {
  console.log("📦 Fetching all repositories...");
  const repos = await getAllRepos();
  const [, portfolioName] = portfolioRepo.split("/");

  const filtered = repos.filter(
    (r) => !r.fork && !r.archived && r.name !== portfolioName
  );

  console.log(`🔍 Processing ${filtered.length} repositories...`);
  const projects = [];

  for (const repo of filtered) {
    console.log(`  → ${repo.name}`);
    const data = await buildProjectData(repo);
    projects.push(data);
  }

  const markdown = renderProjectCards(projects);

  const readmePath = "README.md";
  let readme = fs.readFileSync(readmePath, "utf-8");

  const start = "<!-- PROJECTS:START -->";
  const end = "<!-- PROJECTS:END -->";
  const startIdx = readme.indexOf(start);
  const endIdx = readme.indexOf(end);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Could not find ${start} / ${end} markers in README.md. Add them where you want the projects to appear.`
    );
  }

  const newReadme =
    readme.slice(0, startIdx + start.length) +
    "\n" +
    markdown +
    "\n" +
    readme.slice(endIdx);

  fs.writeFileSync(readmePath, newReadme);
  console.log(`✅ Updated README with ${projects.length} projects.`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
