#!/usr/bin/env bun
// Usage: JWT_SECRET=<secret> bun scripts/gen-token.ts <userId>
// Generates a 10-year dev JWT for SENTINEL_TOKEN. Never commit the output.

const secret = process.env["JWT_SECRET"];
const userId = process.argv[2];

if (!secret || !userId) {
  console.error("Usage: JWT_SECRET=<secret> bun scripts/gen-token.ts <userId>");
  process.exit(1);
}

const b64url = (obj: object) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");

const now = Math.floor(Date.now() / 1000);
const TEN_YEARS = 10 * 365 * 24 * 60 * 60;

const header = { alg: "HS256", typ: "JWT" };
const payload = { sub: userId, iat: now, exp: now + TEN_YEARS };
const unsigned = `${b64url(header)}.${b64url(payload)}`;

const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);
const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned));
const token = `${unsigned}.${Buffer.from(sig).toString("base64url")}`;

console.log("\nAdd to your .env (DO NOT commit this file):\n");
console.log(`SENTINEL_TOKEN=${token}`);
console.log(`SENTINEL_USER_ID=${userId}`);
