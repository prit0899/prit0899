// Fetches all your public repos, pulls language/topics/description/last-updated,
// and writes a markdown table into README.md between marker comments.

const token = process.env.GITHUB_TOKEN;
const username = process.env.GH_USERNAME;
const portfolioRepo = process.env.GITHUB_REPOSITORY; // "owner/repo", set automatically by Actions

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
};

async function ghFetch(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} for ${url}: ${await res.text()}`);
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
    if (batch.length === 0) break;
    repos.push(...batch);
    page++;
  }
  return repos;
}

function fmtDate(iso) {
  return new Date(iso).toISOString().split("T")[0];
}

async function main() {
  const repos = await getAllRepos();
  const [, portfolioName] = portfolioRepo.split("/");

  const filtered = repos.filter(
    (r) => !r.fork && !r.archived && r.name !== portfolioName
  );

  const rows = [];
  for (const repo of filtered) {
    const langs = await ghFetch(repo.languages_url);
    const stack = Object.keys(langs).slice(0, 5).join(", ") || repo.language || "—";
    const topics = (repo.topics || []).join(", ") || "—";
    rows.push({
      name: repo.name,
      url: repo.html_url,
      description: (repo.description || "—").replace(/\|/g, "/"),
      stack,
      topics,
      updated: fmtDate(repo.pushed_at),
    });
  }

  rows.sort((a, b) => (a.updated < b.updated ? 1 : -1));

  const table = [
    "| Project | Description | Tech Stack | Topics | Last Updated |",
    "|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| [${r.name}](${r.url}) | ${r.description} | ${r.stack} | ${r.topics} | ${r.updated} |`
    ),
  ].join("\n");

  const fs = await import("fs");
  const readmePath = "README.md";
  let readme = fs.readFileSync(readmePath, "utf-8");

  const start = "<!-- PROJECTS:START -->";
  const end = "<!-- PROJECTS:END -->";
  const startIdx = readme.indexOf(start);
  const endIdx = readme.indexOf(end);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Could not find ${start} / ${end} markers in README.md. Add them where you want the table to appear.`
    );
  }

  const newReadme =
    readme.slice(0, startIdx + start.length) +
    "\n\n" +
    table +
    "\n\n" +
    readme.slice(endIdx);

  fs.writeFileSync(readmePath, newReadme);
  console.log(`Updated README with ${rows.length} projects.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
