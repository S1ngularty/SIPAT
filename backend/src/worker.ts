import dotenv from "dotenv";

dotenv.config();

await import ("./jobs/workers/ai.worker.js");

console.log("Worker Node process is running!");
