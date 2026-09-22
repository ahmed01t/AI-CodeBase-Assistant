import assert from "assert/strict";
import { codeParserService } from "../../src/modules/code-parser/code-parser.service.js";

async function runTests() {
  console.log("🧪 Running Code Parser Unit Tests...\n");

  // -------------------------------------------------------------------------
  // Test 1: TypeScript AST Symbol & Line Range Extraction
  // -------------------------------------------------------------------------
  console.log("1️⃣  Testing TypeScript parsing...");
  const tsCode = `import { Request, Response } from 'express';
import defaultService from './service';

export interface UserProfile {
  id: string;
  name: string;
}

export type UserRole = 'admin' | 'user';

export enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export class UserService extends BaseService implements IUserService {
  private dbUrl: string;

  constructor(url: string) {
    super();
    this.dbUrl = url;
  }

  public async getUser(id: string): Promise<UserProfile> {
    return { id, name: 'Alice' };
  }
}

export function formatName(first: string, last: string): string {
  return first + ' ' + last;
}
`;

  const tsResult = await codeParserService.parseCode({
    code: tsCode,
    filePath: "src/services/user.service.ts"
  });

  assert.equal(tsResult.success, true, "TypeScript parse should succeed");
  assert.equal(tsResult.language, "typescript", "Language should be typescript");
  assert.equal(tsResult.errors.length, 0, "TypeScript should have 0 syntax errors");

  // Imports
  assert.equal(tsResult.imports.length, 2, "Should extract 2 import statements");
  assert.equal(tsResult.imports[0].source, "express");
  assert.deepEqual(tsResult.imports[0].namedImports, ["Request", "Response"]);
  assert.equal(tsResult.imports[0].location.startLine, 1);
  assert.equal(tsResult.imports[1].source, "./service");
  assert.equal(tsResult.imports[1].defaultImport, "defaultService");

  // Interfaces / Types / Enums
  assert.equal(tsResult.typeDeclarations.length, 3, "Should extract 3 type declarations");
  const interfaceDecl = tsResult.typeDeclarations.find((t) => t.name === "UserProfile");
  assert.ok(interfaceDecl, "UserProfile interface should be extracted");
  assert.equal(interfaceDecl?.kind, "interface");
  assert.equal(interfaceDecl?.isExported, true);
  assert.equal(interfaceDecl?.location.startLine, 4);

  const enumDecl = tsResult.typeDeclarations.find((t) => t.name === "Status");
  assert.ok(enumDecl, "Status enum should be extracted");
  assert.equal(enumDecl?.kind, "enum");

  // Classes & Methods
  assert.equal(tsResult.classes.length, 1, "Should extract 1 class");
  const cls = tsResult.classes[0];
  assert.equal(cls.name, "UserService");
  assert.equal(cls.isExported, true);
  assert.equal(cls.extendsClass, "BaseService");
  assert.equal(cls.location.startLine, 16);
  assert.equal(cls.location.endLine, 27);

  assert.ok(cls.members.length >= 1, "Class should have member methods");
  const getUserMethod = cls.members.find((m: any) => m.name === "getUser") as any;
  assert.ok(getUserMethod, "getUser method should be extracted");
  assert.equal(getUserMethod.visibility, "public");
  assert.equal(getUserMethod.isAsync, true);
  assert.equal(getUserMethod.location.startLine, 24);

  // Functions
  const fmtFunc = tsResult.functions.find((f) => f.name === "formatName");
  assert.ok(fmtFunc, "formatName function should be extracted");
  assert.equal(fmtFunc?.isExported, true);
  assert.equal(fmtFunc?.location.startLine, 29);
  assert.equal(fmtFunc?.location.endLine, 31);

  console.log("   ✅ TypeScript parsing passed!");

  // -------------------------------------------------------------------------
  // Test 2: Python AST Symbol & Line Range Extraction
  // -------------------------------------------------------------------------
  console.log("2️⃣  Testing Python parsing...");
  const pyCode = `import os
import sys
from math import sqrt, pi

class UserProfile(BaseModel):
    def __init__(self, user_id: str, name: str):
        self.user_id = user_id
        self.name = name

    def get_details(self) -> dict:
        return {"id": self.user_id, "name": self.name}

async def fetch_remote_user(user_id: str) -> UserProfile:
    pass

def calculate_area(radius: float) -> float:
    return pi * radius * radius
`;

  const pyResult = await codeParserService.parseCode({
    code: pyCode,
    filePath: "app/models/user.py"
  });

  assert.equal(pyResult.success, true, "Python parse should succeed");
  assert.equal(pyResult.language, "python", "Language should be python");

  // Imports
  assert.ok(pyResult.imports.length >= 2, "Should extract Python imports");
  const mathImp = pyResult.imports.find((i) => i.source === "math");
  assert.ok(mathImp, "math import should be extracted");
  assert.deepEqual(mathImp?.namedImports, ["sqrt", "pi"]);

  // Class
  assert.equal(pyResult.classes.length, 1, "Should extract Python class");
  const pyClass = pyResult.classes[0];
  assert.equal(pyClass.name, "UserProfile");
  assert.equal(pyClass.extendsClass, "BaseModel");
  assert.equal(pyClass.location.startLine, 5);

  // Class Methods
  assert.ok(pyClass.members.length >= 2, "Python class should have methods");
  const initMethod = pyClass.members.find((m: any) => m.name === "__init__") as any;
  assert.ok(initMethod, "__init__ method should be extracted");
  assert.equal(initMethod.location.startLine, 6);

  // Functions
  const areaFunc = pyResult.functions.find((f) => f.name === "calculate_area");
  assert.ok(areaFunc, "calculate_area function should be extracted");
  assert.equal(areaFunc?.location.startLine, 16);

  console.log("   ✅ Python parsing passed!");

  // -------------------------------------------------------------------------
  // Test 3: Unsupported & Error Handled Extensions
  // -------------------------------------------------------------------------
  console.log("3️⃣  Testing unsupported file handling...");
  const unknownResult = await codeParserService.parseCode({
    code: "some content",
    filePath: "data.xyz"
  });

  assert.equal(unknownResult.success, false);
  assert.equal(unknownResult.language, "unknown");
  assert.ok(unknownResult.errors[0].includes("Unsupported"));

  console.log("   ✅ Unsupported file handling passed!");

  console.log("\n🎉 ALL CODE PARSER TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

