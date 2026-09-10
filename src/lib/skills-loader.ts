import fs from "fs/promises";
import os from "os";
import path from "path";

export interface SkillSummary {
  name: string;
  description: string;
  path: string;
  source: "project" | "global";
}

function parseFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const block = match[1];
  const clean = (value?: string) => value?.trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
  return {
    name: clean(block.match(/^name:\s*(.+)$/m)?.[1]),
    description: clean(block.match(/^description:\s*(.+)$/m)?.[1]),
  };
}

async function scanSkillsDir(dir: string, source: SkillSummary["source"]): Promise<SkillSummary[]> {
  const out: SkillSummary[] = [];

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > 3) return;
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(current, entry.name);
      const skillFile = path.join(full, "SKILL.md");
      try {
        const content = await fs.readFile(skillFile, "utf-8");
        const fm = parseFrontmatter(content);
        const name = fm.name || entry.name;
        const description = fm.description || content.split("\n").find((line) => line.trim() && !line.startsWith("#"))?.trim() || name;
        out.push({ name, description: description.slice(0, 200), path: skillFile, source });
      } catch {
        await walk(full, depth + 1);
      }
    }
  }

  await walk(dir, 0);
  return out;
}

export async function loadProjectSkills(workspaceRoot: string): Promise<SkillSummary[]> {
  const projectDir = path.join(workspaceRoot, ".agents", "skills");
  const globalDir = path.join(os.homedir(), ".agents", "skills");
  const [projectSkills, globalSkills] = await Promise.all([
    scanSkillsDir(projectDir, "project"),
    scanSkillsDir(globalDir, "global"),
  ]);

  // Project-local skills override same-named global skills.
  const byName = new Map<string, SkillSummary>();
  for (const skill of projectSkills) byName.set(skill.name, skill);
  for (const skill of globalSkills) if (!byName.has(skill.name)) byName.set(skill.name, skill);
  return [...byName.values()];
}

export function formatSkillsForInstructions(skills: SkillSummary[]): string {
  if (!skills.length) return "";
  return [
    "## Agent Skills",
    `${skills.length} skill(s) are available from project/global .agents/skills. Call list_skills, then load_skill(name) only when a matching workflow is relevant.`,
  ].join("\n");
}

export async function loadProjectSkill(
  workspaceRoot: string,
  name: string,
  maxBytes = 200_000
): Promise<{
  skill: SkillSummary;
  content: string;
  truncated: boolean;
}> {
  const skill = (await loadProjectSkills(workspaceRoot)).find((candidate) => candidate.name === name);
  if (!skill) throw new Error(`Unknown skill: ${name}`);
  const data = await fs.readFile(skill.path);
  return {
    skill,
    content: data.subarray(0, maxBytes).toString("utf-8"),
    truncated: data.length > maxBytes,
  };
}
