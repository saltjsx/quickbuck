import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Execute bot tick every 20 minutes
crons.interval(
  "bot tick",
  { minutes: 20 },
  internal.tick.executeTick
);

export default crons;
