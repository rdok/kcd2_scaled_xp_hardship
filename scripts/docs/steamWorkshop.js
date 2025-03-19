const fs = require("fs");
const path = require("path");

function stripContent(content) {
  return content;
  // .replace(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi, "")
  // .replace(/!\[.*?\]\(https?:\/\/[^\s]+\)/gi, "")
  // .replace(/\[!\[nexus-mods-page\]\(/gi, "")
  // .replace(/\[!\[github-repository\]\(/gi, "")
  // .replace(/\[!\[Showcase\]\(/gi, "")
  // .replace(/^##.*Showcase\s*(\r\n|\n|\r)*\s*/gim, "");
}

function formatSections(content) {
  const lines = content
    .split(/[\r\n]+/)
    .filter((line) => line.trim().length > 0);
  const sections = [];
  let currentSection = [];

  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line) || /^>/.test(line) || /^```/.test(line)) {
      if (currentSection.length > 0) {
        sections.push(currentSection.join("\r\n"));
        currentSection = [];
      }
    }
    currentSection.push(line);
  }

  if (currentSection.length > 0) {
    sections.push(currentSection.join("\r\n"));
  }

  return sections.join("\r\n\r\n").trim();
}

function steamWorkshop(filePaths) {
  const rootDir = path.join(__dirname, "../..");
  let workshopContent = "";

  filePaths.forEach((filePath) => {
    workshopContent += stripContent(fs.readFileSync(filePath, "utf8"));
  });

  workshopContent = formatSections(workshopContent);

  fs.writeFileSync(
    path.join(rootDir, "documentation", "readme_steam_workshop.md"),
    workshopContent,
    "utf8",
  );
}

module.exports = steamWorkshop;
