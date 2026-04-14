import fs from "node:fs/promises";
import path from "node:path";
import { abilityRegistry } from "../dist/abilities/registry.js";
import { buildJobSpecJsonSchema } from "../dist/schemas/job-spec.js";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const generatedDir = path.join(projectRoot, "docs", "generated");
const readmePath = path.join(projectRoot, "README.md");
const schemaPath = path.join(projectRoot, "job-spec.schema.json");
const tablePath = path.join(generatedDir, "abilities-table.md");

async function main(): Promise<void> {
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(schemaPath, `${JSON.stringify(buildJobSpecJsonSchema(), null, 2)}\n`);
  const table = renderAbilityTable();
  await fs.writeFile(tablePath, table);
  await updateReadme(table);
}

function renderAbilityTable(): string {
  const lines = [
    "| Ability | Phase | Dependencies | Parameters | Summary |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const ability of abilityRegistry) {
    const parameters =
      ability.params.length === 0
        ? "-"
        : ability.params
            .map((param) => `${param.name}${param.required ? "" : "?"}:${param.type}`)
            .join(", ");
    lines.push(
      `| \`${ability.name}\` | \`${ability.phase}\` | ${
        ability.dependencies.length > 0 ? ability.dependencies.map((dep) => `\`${dep}\``).join(", ") : "-"
      } | ${parameters} | ${ability.summary} |`
    );
  }
  return `${lines.join("\n")}\n`;
}

async function updateReadme(table: string): Promise<void> {
  const readme = await fs.readFile(readmePath, "utf8");
  const next = readme.replace(
    /<!-- ABILITY_TABLE_START -->([\s\S]*?)<!-- ABILITY_TABLE_END -->/,
    `<!-- ABILITY_TABLE_START -->\n${table}<!-- ABILITY_TABLE_END -->`
  );
  await fs.writeFile(readmePath, next);
}

void main();
