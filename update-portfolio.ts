// update-portfolio.ts
// Fetch GitHub repos and update README

const GITHUB_USER = "prit0899";
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

interface Repo {
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
}

async function fetchRepos(): Promise<Repo[]> {
  const response = await fetch(
    `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=10&type=public`,
    {
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    console.error("Failed to fetch repos:", response.statusText);
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  return await response.json();
}

async function generateProjectsSection(repos: Repo[]): Promise<string> {
  let content = "## 📚 Featured Projects\n\n";

  repos.forEach((repo) => {
    const stars = repo.stargazers_count > 0 ? ` ⭐ ${repo.stargazers_count}` : "";
    const desc = repo.description || "No description";
    content += `- **[${repo.name}](${repo.html_url})** - ${desc}${stars}\n`;
  });

  return content;
}

async function updateReadme(projectsContent: string): Promise<void> {
  const readmePath = "README.md";
  
  // Check if README exists
  try {
    await Deno.stat(readmePath);
  } catch (_err) {
    console.warn("README.md not found, creating basic one...");
    await Deno.writeTextFile(
      readmePath,
      "# Portfolio\n\n<!-- START PROJECTS -->\n\n<!-- END PROJECTS -->\n"
    );
  }

  // Read current README
  const readmeContent = await Deno.readTextFile(readmePath);

  // Find or create markers
  const startMarker = "<!-- START PROJECTS -->";
  const endMarker = "<!-- END PROJECTS -->";

  let newContent: string;

  if (readmeContent.includes(startMarker) && readmeContent.includes(endMarker)) {
    // Replace between markers
    newContent = readmeContent.replace(
      new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`),
      `${startMarker}\n${projectsContent}\n${endMarker}`
    );
  } else {
    // Append if markers don't exist
    newContent = readmeContent + `\n\n${startMarker}\n${projectsContent}\n${endMarker}\n`;
  }

  // Write back
  await Deno.writeTextFile(readmePath, newContent);
  console.log("✅ README.md updated successfully!");
}

// Main execution
async function main() {
  try {
    console.log("🚀 Fetching GitHub repositories...");
    const repos = await fetchRepos();
    
    if (repos.length === 0) {
      console.log("⚠️  No public repositories found");
      return;
    }

    console.log(`📦 Found ${repos.length} repositories`);
    
    const projectsContent = await generateProjectsSection(repos);
    await updateReadme(projectsContent);
    
    console.log("✨ Done!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    Deno.exit(1);
  }
}

await main();
