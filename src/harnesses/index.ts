import { claudeHarness } from "./claude/index";
import type { HarnessDefinition } from "./types";

export const HARNESSES: Record<string, HarnessDefinition> = {
  claude: claudeHarness,
};
