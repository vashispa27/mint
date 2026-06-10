import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const HOOK_EVENTS = ["SessionStart", "UserPromptSubmit", "Stop", "SessionEnd"] as const;

export async function installHooks(projectRoot: string, socketPath: string): Promise<void> {
  const settingsPath = join(projectRoot, ".claude", "settings.json");
  mkdirSync(dirname(settingsPath), { recursive: true });

  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(await Bun.file(settingsPath).text()) as Record<string, unknown>;
    } catch {}
  }

  if (!settings["hooks"]) settings["hooks"] = {};
  const hooks = settings["hooks"] as Record<string, unknown[]>;

  const curlCmd = `curl -s --unix-socket ${socketPath} -X POST http://localhost/hook -d @-`;

  for (const event of HOOK_EVENTS) {
    if (!hooks[event]) hooks[event] = [];

    // Remove any stale mint hooks from a previous session
    hooks[event] = (hooks[event] as Array<Record<string, unknown>>).filter(group => {
      const groupHooks = group["hooks"] as Array<Record<string, string>> | undefined;
      return !groupHooks?.some(h => h["command"]?.includes("--unix-socket /tmp/mint-"));
    });

    hooks[event].push({
      hooks: [{ type: "command", command: curlCmd }],
    });
  }

  await Bun.write(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}
