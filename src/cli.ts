#!/usr/bin/env node
import fs from "node:fs/promises";
import { Command } from "commander";
import { getAbility } from "./abilities/registry.js";
import { runDoctor } from "./core/doctor.js";
import { ImgxError } from "./core/errors.js";
import { EXIT_CODES } from "./core/exit-codes.js";
import { inspectInputs } from "./core/inspect.js";
import { listAbilities } from "./core/planner.js";
import { runJobSpec } from "./core/run.js";
import { parseUseExpression } from "./core/use-parser.js";
import { parseJobSpec } from "./schemas/job-spec.js";
import type { JobSpec } from "./core/types.js";

const program = new Command();

program.name("imgx").description("Composable deterministic image processing CLI.");

const abilityCommand = program.command("ability").description("Explore the built-in atomic abilities.");

abilityCommand
  .command("list")
  .option("--json", "Emit JSON instead of text.", false)
  .action((options) => {
    const abilities = listAbilities();
    if (options.json) {
      process.stdout.write(`${JSON.stringify(abilities, null, 2)}\n`);
      return;
    }
    for (const ability of abilities) {
      process.stdout.write(`${ability.name}\t${ability.phase}\t${ability.summary}\n`);
    }
  });

abilityCommand
  .command("show")
  .description("Show one ability in detail.")
  .argument("<name>", "Ability name.")
  .option("--json", "Emit JSON instead of text.", false)
  .action((name, options) => {
    const ability = getAbility(name);
    if (!ability) {
      throw new ImgxError(`Unknown ability "${name}".`, EXIT_CODES.INVALID_INPUT);
    }
    if (options.json) {
      process.stdout.write(`${JSON.stringify(ability, null, 2)}\n`);
      return;
    }
    process.stdout.write(`${ability.name}\n${ability.summary}\nPhase: ${ability.phase}\n`);
    if (ability.params.length > 0) {
      process.stdout.write(`Parameters:\n`);
      for (const param of ability.params) {
        process.stdout.write(`- ${param.name}: ${param.description}\n`);
      }
    }
  });

program
  .command("doctor")
  .description("Check external tool availability.")
  .option("--use <value>", "Ability expression used to scope the dependency check.", collect, [])
  .option("--json", "Emit JSON instead of text.", false)
  .action(async (options) => {
    const uses = (options.use as string[]).map(parseUseExpression);
    const result = await runDoctor(uses);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    for (const tool of Object.values(result.capabilities.tools)) {
      process.stdout.write(`${tool.tool}\t${tool.available ? "ok" : "missing"}\t${tool.version ?? tool.error ?? ""}\n`);
    }
    if (result.required.length > 0) {
      process.stdout.write(`Required for requested abilities: ${result.required.join(", ")}\n`);
    }
    if (result.advice.length > 0) {
      process.stdout.write(`${result.advice.join("\n")}\n`);
    }
  });

program
  .command("inspect")
  .description("Inspect one or more inputs.")
  .argument("<inputs...>", "Input files.")
  .option("--use <value>", "Optional inspect abilities.", collect, [])
  .option("--json", "Emit JSON instead of text.", false)
  .action(async (inputs, options) => {
    const rawUses = (options.use as string[]).map(parseUseExpression);
    const includeMeta = rawUses.length === 0 || rawUses.some((use) => use.name === "inspect-meta");
    const includeCapabilities = rawUses.some((use) => use.name === "inspect-capability");
    const results = await inspectInputs(inputs, {
      includeMeta,
      includeCapabilities
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
      return;
    }
    for (const result of results) {
      process.stdout.write(`${result.path}\n`);
      if (result.basic) {
        process.stdout.write(`  ${result.basic.width}x${result.basic.height} ${result.basic.format} ${result.basic.bytes} bytes\n`);
      }
      if (result.metadata) {
        process.stdout.write(`  metadata keys: ${Object.keys(result.metadata).length}\n`);
      }
    }
  });

program
  .command("run")
  .description("Process one or more inputs using atomic abilities.")
  .argument("[inputs...]", "Input files when --spec is not used.")
  .option("--use <value>", "Atomic ability expression.", collect, [])
  .option("--spec <path>", "Read a JobSpec from a file or stdin when set to '-'.")
  .option("--json", "Emit JSON instead of text.", false)
  .option("--dry-run", "Plan commands without mutating outputs.", false)
  .action(async (inputs, options) => {
    const spec = await loadJobSpec(inputs as string[], options);
    const result = await runJobSpec(spec, { dryRun: options.dryRun });
    if (result.status === "partial") {
      process.exitCode = EXIT_CODES.PARTIAL_SUCCESS;
    }
    if (result.status === "failed") {
      const failedItems = result.items.filter((item) => item.status === "failed");
      const allInvalidInput = failedItems.length > 0 && failedItems.every((item) => item.failureCode === EXIT_CODES.INVALID_INPUT);
      process.exitCode = allInvalidInput ? EXIT_CODES.INVALID_INPUT : EXIT_CODES.PROCESSING_FAILED;
    }
    if (options.json || spec.report?.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    process.stdout.write(`${result.status}\n`);
    for (const item of result.items) {
      process.stdout.write(`${item.status}\t${item.input}\t${item.output ?? "-"}\n`);
    }
  });

program.showHelpAfterError();

main().catch((error) => {
  if (error instanceof ImgxError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(error.exitCode);
  }
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(EXIT_CODES.PROCESSING_FAILED);
});

async function main(): Promise<void> {
  await program.parseAsync(process.argv);
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

async function loadJobSpec(inputs: string[], options: { use?: string[]; spec?: string; json?: boolean }): Promise<JobSpec> {
  if (options.spec) {
    const raw = options.spec === "-" ? await readStdin() : await fs.readFile(options.spec, "utf8");
    return parseJobSpec(JSON.parse(raw));
  }
  return parseJobSpec({
    inputs,
    uses: (options.use ?? []).map(parseUseExpression),
    report: options.json ? { json: true } : undefined
  });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
