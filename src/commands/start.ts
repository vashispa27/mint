import { join } from "path";
import { createInterface } from "readline";
import { findProjectRoot, readProjectConfig } from "../cli/project";
import { startDaemon } from "../daemon/server";
import { createState } from "../daemon/state";
import { HARNESSES } from "../harnesses/index";

export async function cmdStart(args: string[]): Promise<void> {
  const stream = args.includes("--stream");
  const harnessName = args.find(a => !a.startsWith("--")) ?? "";
  const harness = HARNESSES[harnessName];

  if (!harness) {
    const supported = Object.keys(HARNESSES).join(", ");
    console.error(`Usage: mint start <harness> [--stream]`);
    console.error(`Supported: ${supported}`);
    process.exit(1);
  }

  // 1. Find project root, prompt to init if missing
  let projectRoot = findProjectRoot();

  if (!projectRoot) {
    const cwd = process.cwd();
    const answer = await promptLine(`  ${cwd} is not inside a mint project.\n  Initialize one here? (y/n) › `);
    if (answer.toLowerCase() === "y") {
      const { cmdInit } = await import("./init");
      await cmdInit();
      projectRoot = cwd;
    } else {
      process.exit(0);
    }
  }

  readProjectConfig(projectRoot);
  console.log(`✓ Mint project: ${projectRoot}`);

  // 2. Generate session ID + socket path
  //TO:DO We've to check if hte session id has to be random or we add timestamp here.
  const sessionId = `ses_${randomId()}`;
  const socketPath = `/tmp/mint-${shortHash(projectRoot)}-${harness.name}.sock`;

  // 3. Install harness-specific hooks
  await harness.installHooks(projectRoot, socketPath);

  // 4. Build state and start daemon with harness-specific hook handler
  const sessionsDir = join(projectRoot, ".mint", "sessions");
  const sessionFile = join(sessionsDir, `${sessionId}.jsonl`);
  const streamFile = stream ? join(sessionsDir, `${sessionId}.stream.jsonl`) : null;
  const state = createState({ sessionId, sessionFile, streamFile, projectRoot, harness: harness.name });
  const daemon = startDaemon(socketPath, state, harness.handleHook);

  // 5. Spawn the harness
  console.log(`  Starting ${harness.name}...\n`);
  const proc = Bun.spawn([harness.command], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  await proc.exited;
  daemon.stop();

  // 6. Print summary
  console.log(`\n  Mint Session ended.`);
  console.log(`  Session ID: ${sessionId}`);
  if (stream) console.log(`  Stream file: ${sessionId}.stream.jsonl`);
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function shortHash(s: string): string {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h).toString(36).slice(0, 6);
}

async function promptLine(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
