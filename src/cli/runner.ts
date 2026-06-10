import { cmdInit } from "../commands/init";
import { cmdStart } from "../commands/start";

export async function run(args: string[]): Promise<void> {
  const [cmd, ...rest] = args;

  switch (cmd) {
    case "init":
      await cmdInit();
      break;

    case "start":
      await cmdStart(rest);
      break;

    default:
      console.log("mint — Filesystem for AI agents\n");
      console.log("Usage:");
      console.log("  mint init                  Initialize a mint project in the current directory");
      console.log("  mint start <harness>       Start a tracked session");
      console.log("  mint log                   List all sessions for the current project");
      console.log("  mint show <session-id>     Replay a session");
      console.log("  mint status                Show active sessions");
      break;
  }
}
