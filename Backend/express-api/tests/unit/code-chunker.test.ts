import assert from "assert/strict";
import { codeChunkerService } from "../../src/modules/code-chunker/code-chunker.service.js";

async function runTests() {
  console.log("🧪 Running Code Chunker Unit Tests...\n");

  // -------------------------------------------------------------------------
  // Test 1: TypeScript AST-Aware Chunking
  // -------------------------------------------------------------------------
  console.log("1️⃣  Testing TypeScript AST Chunking...");
  const tsCode = `import { Request, Response } from 'express';
import defaultService from './service';

export interface UserProfile {
  id: string;
  name: string;
}

export class UserService {
  private dbUrl: string;

  constructor(url: string) {
    this.dbUrl = url;
  }

  public async getUser(id: string): Promise<UserProfile> {
    return { id, name: 'Alice' };
  }

  public async deleteUser(id: string): Promise<boolean> {
    return true;
  }
}

export function formatName(first: string, last: string): string {
  return first + ' ' + last;
}
`;

  const tsResult = await codeChunkerService.chunkFile({
    code: tsCode,
    filePath: "src/services/user.service.ts"
  });

  assert.equal(tsResult.language, "typescript");
  assert.ok(tsResult.totalChunks >= 4, "Should create at least 4 chunks (imports, interface, methods, function)");

  // 1. Check Imports chunk
  const importChunk = tsResult.chunks.find((c) => c.metadata.symbolType === "import");
  assert.ok(importChunk, "Import chunk should exist");
  assert.equal(importChunk?.startLine, 1);
  assert.ok(importChunk?.content.includes("import { Request, Response }"));

  // 2. Check Interface chunk
  const interfaceChunk = tsResult.chunks.find((c) => c.metadata.symbolName === "UserProfile");
  assert.ok(interfaceChunk, "UserProfile interface chunk should exist");
  assert.equal(interfaceChunk?.metadata.symbolType, "typeDeclaration");
  assert.ok(interfaceChunk?.content.includes("export interface UserProfile"));

  // 3. Check Class Methods chunks
  const getUserChunk = tsResult.chunks.find((c) => c.metadata.symbolName === "getUser");
  assert.ok(getUserChunk, "getUser method chunk should exist");
  assert.equal(getUserChunk?.metadata.parentSymbol, "UserService");
  assert.equal(getUserChunk?.metadata.symbolType, "method");
  assert.ok(getUserChunk?.content.includes("public async getUser"));

  const deleteUserChunk = tsResult.chunks.find((c) => c.metadata.symbolName === "deleteUser");
  assert.ok(deleteUserChunk, "deleteUser method chunk should exist");
  assert.equal(deleteUserChunk?.metadata.parentSymbol, "UserService");

  // 4. Check Standalone Function chunk
  const funcChunk = tsResult.chunks.find((c) => c.metadata.symbolName === "formatName");
  assert.ok(funcChunk, "formatName function chunk should exist");
  assert.equal(funcChunk?.metadata.symbolType, "function");
  assert.ok(funcChunk?.content.includes("export function formatName"));

  console.log("   ✅ TypeScript AST chunking passed!");

  // -------------------------------------------------------------------------
  // Test 2: Python AST-Aware Chunking
  // -------------------------------------------------------------------------
  console.log("2️⃣  Testing Python AST Chunking...");
  const pyCode = `import os
from math import sqrt

class Calculator:
    def add(self, a: int, b: int) -> int:
        return a + b

    def subtract(self, a: int, b: int) -> int:
        return a - b

def calculate_distance(x: float, y: float) -> float:
    return sqrt(x*x + y*y)
`;

  const pyResult = await codeChunkerService.chunkFile({
    code: pyCode,
    filePath: "math_utils.py"
  });

  assert.equal(pyResult.language, "python");
  assert.ok(pyResult.totalChunks >= 3, "Python file should produce multiple chunks");

  const addMethodChunk = pyResult.chunks.find((c) => c.metadata.symbolName === "add");
  assert.ok(addMethodChunk, "add method chunk should exist");
  assert.equal(addMethodChunk?.metadata.parentSymbol, "Calculator");

  const distFuncChunk = pyResult.chunks.find((c) => c.metadata.symbolName === "calculate_distance");
  assert.ok(distFuncChunk, "calculate_distance function chunk should exist");
  assert.equal(distFuncChunk?.metadata.symbolType, "function");

  console.log("   ✅ Python AST chunking passed!");

  // -------------------------------------------------------------------------
  // Test 3: Sliding Window Fallback for Raw Text / Markdown
  // -------------------------------------------------------------------------
  console.log("3️⃣  Testing Sliding Window Fallback...");
  const lines: string[] = [];
  for (let i = 1; i <= 80; i++) {
    lines.push(`Line number ${i} of documentation`);
  }
  const textContent = lines.join("\n");

  const textResult = await codeChunkerService.chunkFile({
    code: textContent,
    filePath: "README.md",
    maxLinesPerChunk: 30,
    overlapLines: 5
  });

  assert.ok(textResult.totalChunks > 1, "Should create multiple sliding window chunks");
  assert.equal(textResult.chunks[0].startLine, 1);
  assert.equal(textResult.chunks[0].endLine, 30);
  assert.equal(textResult.chunks[1].startLine, 26); // 30 - 5 + 1 = 26 (5 line overlap)

  console.log("   ✅ Sliding window fallback passed!");

  console.log("\n🎉 ALL CODE CHUNKER TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

