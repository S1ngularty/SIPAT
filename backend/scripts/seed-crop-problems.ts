/**
 * Seed / import crop problem reference data.
 *
 * Usage (run from `backend/`):
 *   npm run seed:crop-problems
 *   npm run seed:crop-problems -- --file ./seeds/other.json
 *   npm run seed:crop-problems -- --dry-run
 *   npm run seed:crop-problems -- --drop
 *
 * The import is idempotent: records are matched on their stable `id` and
 * updated in place, so re-running never creates duplicates.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { CropProblemRepository } from "../src/modules/crop-problem/cropProblem.repository.js";
import { createCropProblemSchema } from "../src/modules/crop-problem/cropProblem.validation.js";
import { CropProblemModel } from "../src/modules/crop-problem/cropProblem.model.js";
import type { CreateCropProblemInput } from "../src/modules/crop-problem/cropProblem.types.js";

interface SettledItem {
  valid: CreateCropProblemInput[];
  invalid: { index: number; id?: string; errors: unknown }[];
}

function readFlag(name: string): boolean {
  return process.argv.includes(name);
}

function readOption(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index === -1) return undefined;

  return process.argv[index + 1];
}

/** Accepts a bare array, `{ cropProblems: [...] }`, or `{ data: [...] }`. */
function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidate = record.cropProblems ?? record.data;

    if (Array.isArray(candidate)) return candidate;
  }

  throw new Error(
    "Seed file must be an array or an object with a `cropProblems` / `data` array",
  );
}

function validateItems(items: unknown[]): SettledItem {
  const valid: CreateCropProblemInput[] = [];
  const invalid: { index: number; id?: string; errors: unknown }[] = [];
  const seen = new Set<string>();

  items.forEach((item, index) => {
    const parsed = createCropProblemSchema.safeParse(item);

    if (!parsed.success) {
      invalid.push({ index, errors: parsed.error.flatten() });
      return;
    }

    if (seen.has(parsed.data.id)) {
      invalid.push({
        index,
        id: parsed.data.id,
        errors: { _errors: [`Duplicate id "${parsed.data.id}" in seed file`] },
      });
      return;
    }

    seen.add(parsed.data.id);
    valid.push(parsed.data);
  });

  return { valid, invalid };
}

async function main(): Promise<void> {
  const filePath = path.resolve(
    process.cwd(),
    readOption("--file") ?? "seeds/crop-problems.json",
  );

  const dryRun = readFlag("--dry-run");
  const shouldDrop = readFlag("--drop");

  const raw = await readFile(filePath, "utf8");
  const payload = JSON.parse(raw) as unknown;
  const items = extractItems(payload);

  const { valid, invalid } = validateItems(items);

  console.log(`Loaded ${items.length} record(s) from ${filePath}`);
  console.log(`  valid: ${valid.length}`);
  console.log(`  invalid: ${invalid.length}`);

  if (invalid.length > 0) {
    console.error("\nInvalid records:");
    console.error(JSON.stringify(invalid, null, 2));
  }

  if (dryRun) {
    console.log("\n--dry-run: no changes written.");
    return;
  }

  if (valid.length === 0) {
    console.error("\nNothing to import. Aborting.");
    process.exitCode = 1;
    return;
  }

  const dbUri = process.env.DB_URI;

  if (!dbUri) {
    throw new Error("DB_URI is not set (check backend/.env)");
  }

  await mongoose.connect(dbUri);
  console.log(`\nConnected to database: ${mongoose.connection.host}`);

  try {
    if (shouldDrop) {
      const deleted = await CropProblemModel.deleteMany({}).exec();
      console.log(`--drop: removed ${deleted.deletedCount ?? 0} existing record(s)`);
    }

    const repository = new CropProblemRepository();
    const result = await repository.upsertMany(valid);

    console.log("\nImport complete:");
    console.log(`  processed : ${result.total}`);
    console.log(`  matched   : ${result.matched}`);
    console.log(`  modified  : ${result.modified}`);
    console.log(`  upserted  : ${result.upserted}`);
    console.log(`  collection: ${CropProblemModel.collection.name}`);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected.");
  }

  if (invalid.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\nSeed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
