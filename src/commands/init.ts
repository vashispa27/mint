import { existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { findProjectRoot, sanitizePath, type ProjectConfig } from "../cli/project";

export async function cmdInit(): Promise<void> {
  const cwd = process.cwd();
  const existing = findProjectRoot(cwd);

  if (existing) {
    console.error(`✗ Already inside a mint project (${existing})`);
    console.error("  Mint projects cannot be nested.");
    process.exit(1);
  }

  const mintDir = join(cwd, ".mint");
  mkdirSync(join(mintDir, "sessions"), { recursive: true });

  const config: ProjectConfig = {
    id: sanitizePath(cwd),
    name: basename(cwd),
    path: cwd,
    created: new Date().toISOString(),
  };

  await Bun.write(join(mintDir, "config.json"), JSON.stringify(config, null, 2) + "\n");

  console.log(`✓ Initialized mint project at ${cwd}`);
  console.log("  Run `mint start <harness>` to begin a session.");
}

