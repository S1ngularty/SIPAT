import dotenv from "dotenv";

dotenv.config();

const { default: connectDB } =
  await import("./core/configs/mongoose.config.js");
await import("./jobs/workers/ai.worker.js");

connectDB();

console.log("Worker Node process is running!");
