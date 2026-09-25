import assert from "assert/strict";
import { staticIndexerService } from "../../src/modules/code-intelligence/static-indexer.service.js";

async function run() {
  const source = `
import { AuthService } from "./auth.service";

export class LoginController {
  async login() { return new AuthService().authenticate(); }
}

router.post("/login", async () => {});
const users = await supabase.from("users").select();
const createAlert = catchAsync(async () => {});
`;

  const analysis = await staticIndexerService.analyzeFile(source, "src/login.controller.ts");
  assert.equal(analysis.parseSucceeded, true);
  assert.ok(analysis.symbols.some((symbol) => symbol.name === "LoginController"));
  assert.deepEqual(analysis.imports[0].importedSymbols, ["AuthService"]);
  assert.deepEqual(analysis.routes, [{ method: "POST", path: "/login", startLine: 8, endLine: 8 }]);
  assert.deepEqual(analysis.databaseReferences, [{ reference: "users", startLine: 9, endLine: 9 }]);
  assert.ok(analysis.symbols.some((symbol) => symbol.name === "createAlert"));
  console.log("Static indexer test passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
