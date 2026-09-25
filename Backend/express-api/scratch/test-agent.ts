import dotenv from "dotenv";
dotenv.config();

import { getMongoDb } from "../src/lib/mongodb.js";
import { codeExplorerService } from "../src/modules/code-explorer/code-explorer.service.js";
import { agentRunner } from "../src/modules/conversations/agent.runner.js";

async function main() {
  const db = await getMongoDb();
  if (!db) {
    console.error("Failed to connect to MongoDB");
    return;
  }

  const repos = await db.collection("raw_files").distinct("repository_id");
  const targetRepoId = repos[0];

  const testQuestions = [
    "What is the tech stack of this repository and what does it do?",
  ];

  for (const q of testQuestions) {
    console.log(`\n==================================================`);
    console.log(`Testing question: "${q}"`);
    console.log(`==================================================`);

    const searchRes = await codeExplorerService.searchCodebase({
      repositoryId: targetRepoId,
      query: q,
      limit: 2
    });
    console.log(`Matches found: ${searchRes.totalMatches}`);
    searchRes.results.forEach(r => console.log(`  - File: ${r.filePath} (lines ${r.startLine}-${r.endLine}) [Score: ${r.score}]`));

    console.log("Running agent runner...");
    const agentRes = await agentRunner.runAgent({
      supabase: null as any,
      projectId: "test",
      repositoryId: targetRepoId,
      userQuestion: q,
      chatHistory: []
    });

    console.log("\n--- AGENT RESPONSE ---");
    console.log(agentRes.answer);
    console.log("----------------------");
  }
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
