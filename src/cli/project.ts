import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  created: string;
}

export function sanitizePath(absPath: string): string {
  return absPath.toLowerCase().replace(/\//g, "-");
}

export function findProjectRoot(from: string = process.cwd()): string | null {
  let dir = from;
  while (true) {
    if (existsSync(join(dir, ".mint"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null; // filesystem root
    dir = parent;
  }
}

export function readProjectConfig(root: string): ProjectConfig {
  return JSON.parse(readFileSync(join(root, ".mint", "config.json"), "utf8")) as ProjectConfig;
}
