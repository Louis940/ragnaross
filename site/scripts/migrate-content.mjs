#!/usr/bin/env node
/**
 * One-off migration: split legacy docs/*.md into sections + articles.
 * Run from site/: node scripts/migrate-content.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const docsDir = path.join(root, "src/content/docs");
const sectionsDir = path.join(root, "src/content/sections");
const articlesDir = path.join(root, "src/content/articles");

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*"(.*)"\s*$/);
    if (m) data[m[1]] = m[2];
  }
  return { data, body: match[2] };
}

function extractImage(body) {
  const match = body.match(
    /<image\s+src="([^"]+)"\s+alt="([^"]*)"\s*[^>]*\/?>/i,
  );
  if (!match) return { image: undefined, body };
  const image = match[1];
  const md = `![${match[2]}](${match[1]})`;
  return { image, body: body.replace(match[0], md).trim() };
}

function extractRating(body) {
  const match = body.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
  return match ? parseFloat(match[1]) : undefined;
}

function firstParagraph(body) {
  const lines = body
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("!["));
  return lines[0]?.slice(0, 200);
}

function writeSection(relPath, frontmatter, body = "") {
  const lines = [];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const [yk, yv] of Object.entries(v)) {
        lines.push(`  "${yk}": "${String(yv).replace(/"/g, '\\"')}"`);
      }
    } else {
      lines.push(`${k}: "${String(v).replace(/"/g, '\\"')}"`);
    }
  }
  const content = `---\n${lines.join("\n")}\n---\n\n${body}`.trimEnd() + "\n";
  const out = path.join(sectionsDir, relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
}

function writeArticle(sectionId, slug, frontmatter, body) {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) =>
      typeof v === "number" ? `${k}: ${v}` : `${k}: "${String(v).replace(/"/g, '\\"')}"`,
    )
    .join("\n");
  const content = `---\n${fm}\n---\n\n${body.trim()}\n`;
  const out = path.join(articlesDir, `${sectionId}/${slug}.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
}

function migrateCoffee() {
  const raw = fs.readFileSync(path.join(docsDir, "unprofessionals/coffee.md"), "utf8");
  const { data, body } = parseFrontmatter(raw);

  let currentYear;
  const yearIntros = {};
  let pendingIntro = [];
  let currentArticle = null;

  function flushIntro() {
    const text = pendingIntro.join("\n").trim();
    if (text && currentYear) yearIntros[currentYear] = text.split("\n\n")[0];
    pendingIntro = [];
  }

  function flushArticle() {
    if (!currentArticle) return;
    let { image, body: cleaned } = extractImage(currentArticle.body.trim());
    const rating = extractRating(cleaned);
    const description = firstParagraph(cleaned);
    writeArticle("unprofessionals/coffee", slugify(currentArticle.title), {
      title: currentArticle.title,
      section: "unprofessionals/coffee",
      ...(currentYear ? { year: currentYear } : {}),
      ...(description ? { description } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(image ? { image } : {}),
    }, cleaned);
    currentArticle = null;
  }

  for (const line of body.split("\n")) {
    const h1 = line.match(/^#\s+(\d{4})(?:\s*-\s*(.+))?$/);
    if (h1) {
      flushArticle();
      flushIntro();
      currentYear = parseInt(h1[1], 10);
      if (h1[2]?.trim()) pendingIntro.push(h1[2].trim());
      continue;
    }

    if (line.startsWith("## ")) {
      flushArticle();
      flushIntro();
      const title = line.slice(3).trim();
      if (title.startsWith("At present,")) {
        if (currentYear) yearIntros[currentYear] = title;
        continue;
      }
      currentArticle = { title, body: "" };
      continue;
    }

    if (currentArticle) {
      currentArticle.body += line + "\n";
    } else if (currentYear && line.trim()) {
      pendingIntro.push(line);
    }
  }

  flushArticle();
  flushIntro();

  writeSection("unprofessionals/coffee.md", {
    title: data.title,
    description: data.description,
    groupBy: "year",
    yearIntros,
  });
}

function migrateBaking() {
  const raw = fs.readFileSync(path.join(docsDir, "unprofessionals/food-int/baking.md"), "utf8");
  const { data, body } = parseFrontmatter(raw);

  writeSection(
    "unprofessionals/food-int/baking.md",
    { title: data.title, description: "Recipes and baking experiments." },
    "Notes on things I've baked at home.",
  );

  const match = body.match(/^## ([^\n]+)\n([\s\S]*)$/m);
  if (!match) return;

  const title = match[1].trim();
  const articleBody = match[2].trim();
  const description = firstParagraph(articleBody);
  writeArticle("unprofessionals/food-int/baking", slugify(title), {
    title,
    section: "unprofessionals/food-int/baking",
    ...(description ? { description } : {}),
  }, articleBody);
}

function migrateFoodExt() {
  const raw = fs.readFileSync(path.join(docsDir, "unprofessionals/food-ext.md"), "utf8");
  const { data, body } = parseFrontmatter(raw);

  writeSection(
    "unprofessionals/food-ext.md",
    { title: data.title, description: data.description },
    "Restaurants, food trucks, and memorable meals away from my own kitchen.",
  );

  for (const part of body.split(/^## /m).filter(Boolean)) {
    const [titleLine, ...rest] = part.split("\n");
    const title = titleLine.trim().replace(/^#\s+/, "");
    if (!title) continue;
    const articleBody = rest.join("\n").trim();
    const description = firstParagraph(articleBody);
    writeArticle("unprofessionals/food-ext", slugify(title), {
      title,
      section: "unprofessionals/food-ext",
      ...(description ? { description } : {}),
    }, articleBody);
  }
}

function migrateSimpleSection(relPath, intro) {
  const raw = fs.readFileSync(path.join(docsDir, relPath), "utf8");
  const { data } = parseFrontmatter(raw);
  writeSection(relPath, { title: data.title, description: data.description }, intro);
}

fs.mkdirSync(sectionsDir, { recursive: true });
fs.mkdirSync(articlesDir, { recursive: true });

migrateCoffee();
migrateBaking();
migrateFoodExt();
migrateSimpleSection(
  "unprofessionals/food-int.md",
  "Home cooking notes. Sub-sections such as baking live below.",
);
migrateSimpleSection(
  "unprofessionals/beer.md",
  "Notes on beer — add tasting notes or links when you are ready.",
);
migrateSimpleSection(
  "unprofessionals/books.md",
  "Media notes — add recommendations or reviews when you are ready.",
);

console.log("Migration complete.");
