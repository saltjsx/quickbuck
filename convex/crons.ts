import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Execute bot tick every 5 minutes
crons.interval(
  "bot tick",
  { minutes: 5 },
  internal.tick.executeTick
);

export default crons;
