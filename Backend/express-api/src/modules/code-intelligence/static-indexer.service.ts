import { codeParserService } from "../code-parser/code-parser.service.js";
import type {
  StaticDatabaseEvidence,
  StaticFileAnalysis,
  StaticRouteEvidence,
  StaticSymbolEvidence,
} from "../ingestion/ingestion.types.js";

const ROUTE_PATTERN = /(?:router|app)\.(get|post|put|patch|delete|use)\s*\(\s*["'`]([^"'`]+)/gi;
const DECORATOR_ROUTE_PATTERN = /@(Get|Post|Put|Patch|Delete)\s*\(\s*["'`]([^"'`]+)/gi;
const DATABASE_PATTERN = /\.from\s*\(\s*["'`]([^"'`]+)/gi;
const ASSIGNED_FUNCTION_PATTERN = /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|(?:async\s*)?[A-Za-z_$][\w$]*\s*\()/g;
const COMMONJS_FUNCTION_PATTERN = /(?:^|\n)\s*(?:module\.exports|exports)\.([A-Za-z_$][\w$]*)\s*=/g;

function lineForOffset(content: string, offset: number): number {
  return content.slice(0, offset).split("\n").length;
}

function dedupe<T extends { name?: string; source?: string; startLine: number }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name || item.source}:${item.startLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Creates low-cost static evidence for one file. It never calls an embedding model. */
export class StaticIndexerService {
  async analyzeFile(code: string, filePath: string): Promise<StaticFileAnalysis> {
    const parsed = await codeParserService.parseCode({ code, filePath });
    const symbols: StaticSymbolEvidence[] = [];

    for (const cls of parsed.classes) {
      symbols.push({ name: cls.name, kind: "class", startLine: cls.location.startLine, endLine: cls.location.endLine });
      for (const member of cls.members) {
        symbols.push({
          name: member.name,
          qualifiedName: `${cls.name}.${member.name}`,
          kind: "method",
          startLine: member.location.startLine,
          endLine: member.location.endLine,
        });
      }
    }
    for (const fn of parsed.functions) {
      symbols.push({ name: fn.name, kind: "function", startLine: fn.location.startLine, endLine: fn.location.endLine });
    }
    for (const type of parsed.typeDeclarations) {
      symbols.push({
        name: type.name,
        kind: type.kind === "typeAlias" ? "type" : type.kind,
        startLine: type.location.startLine,
        endLine: type.location.endLine,
      });
    }
    // Controllers often wrap handlers (for example `const createAlert =
    // catchAsync(async () => ...)`), which is not an arrow/function AST node.
    // Record that lightweight, syntactic definition rather than losing it.
    for (const fallback of this.extractAssignedFunctions(code)) {
      if (!symbols.some((symbol) => symbol.name === fallback.name && symbol.startLine === fallback.startLine)) {
        symbols.push(fallback);
      }
    }

    const routes = this.extractRoutes(code);
    const databaseReferences = this.extractDatabaseReferences(code);
    return {
      indexedAt: new Date().toISOString(),
      parserVersion: 1,
      language: parsed.language,
      parseSucceeded: parsed.success,
      symbols: dedupe(symbols),
      imports: parsed.imports.map((item) => ({
        source: item.source,
        importedSymbols: [item.defaultImport, item.namespaceImport, ...item.namedImports]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.split(" as ")[0].trim()),
        startLine: item.location.startLine,
        endLine: item.location.endLine,
      })),
      routes,
      databaseReferences,
      isTestFile: /(?:^|\/)(?:__tests__\/)?[^/]+\.(?:test|spec)\.[^/]+$/i.test(filePath) || /(?:^|\/)tests?\//i.test(filePath),
    };
  }

  private extractRoutes(code: string): StaticRouteEvidence[] {
    const routes: StaticRouteEvidence[] = [];
    for (const pattern of [ROUTE_PATTERN, DECORATOR_ROUTE_PATTERN]) {
      pattern.lastIndex = 0;
      for (let match = pattern.exec(code); match; match = pattern.exec(code)) {
        const startLine = lineForOffset(code, match.index);
        routes.push({ method: match[1].toUpperCase(), path: match[2], startLine, endLine: startLine });
      }
    }
    return routes;
  }

  private extractDatabaseReferences(code: string): StaticDatabaseEvidence[] {
    const references: StaticDatabaseEvidence[] = [];
    DATABASE_PATTERN.lastIndex = 0;
    for (let match = DATABASE_PATTERN.exec(code); match; match = DATABASE_PATTERN.exec(code)) {
      const startLine = lineForOffset(code, match.index);
      references.push({ reference: match[1], startLine, endLine: startLine });
    }
    return references;
  }

  private extractAssignedFunctions(code: string): StaticSymbolEvidence[] {
    const symbols: StaticSymbolEvidence[] = [];
    for (const pattern of [ASSIGNED_FUNCTION_PATTERN, COMMONJS_FUNCTION_PATTERN]) {
      pattern.lastIndex = 0;
      for (let match = pattern.exec(code); match; match = pattern.exec(code)) {
        const startLine = lineForOffset(code, match.index);
        symbols.push({ name: match[1], kind: "function", startLine, endLine: startLine });
      }
    }
    return symbols;
  }
}

export const staticIndexerService = new StaticIndexerService();
