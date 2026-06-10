#!/usr/bin/env bun
import { run } from "./cli/runner";

await run(process.argv.slice(2));
