import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL =
  process.env.VITE_CONVEX_URL || "https://exuberant-donkey-345.convex.cloud";
const clerkId = process.argv[2];

if (!clerkId) {
  console.error("Usage: node scripts/grant-admin.js <clerkUserId>");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  try {
    console.log(`Adding admin: ${clerkId}`);
    const res = await client.mutation("gameConfig:addAdmin", { clerkId });
    console.log("Result:", res);
    console.log("Done. Verify admins with: node scripts/list-admins.js");
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
