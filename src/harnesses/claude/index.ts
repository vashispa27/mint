import { installHooks } from "./hooks";
import { handleHook } from "./handlers";
import type { HarnessDefinition } from "../types";

export const claudeHarness: HarnessDefinition = {
  name: "claude",
  command: "claude",
  installHooks,
  handleHook,
};
