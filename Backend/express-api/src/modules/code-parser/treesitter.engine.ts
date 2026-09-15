import Parser from "web-tree-sitter";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isInitialized = false;
const loadedLanguages: Map<string, any> = new Map();

function getModuleRoot(): string {
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    const nodeModulesPath = path.join(currentDir, "node_modules");
    if (fs.existsSync(nodeModulesPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return process.cwd();
}

export async function initTreeSitter(): Promise<typeof Parser> {
  if (!isInitialized) {
    const rootDir = getModuleRoot();
    const wasmDirectory = path.resolve(rootDir, "node_modules", "web-tree-sitter");

    await Parser.init({
      locateFile: (scriptName: string) => path.join(wasmDirectory, scriptName)
    });
    isInitialized = true;
  }
  return Parser;
}

export async function getLanguageGrammar(language: "typescript" | "tsx" | "javascript" | "python"): Promise<any> {
  await initTreeSitter();

  if (loadedLanguages.has(language)) {
    return loadedLanguages.get(language);
  }

  const rootDir = getModuleRoot();
  let wasmFileName = "tree-sitter-typescript.wasm";

  switch (language) {
    case "tsx":
      wasmFileName = "tree-sitter-tsx.wasm";
      break;
    case "javascript":
      wasmFileName = "tree-sitter-javascript.wasm";
      break;
    case "python":
      wasmFileName = "tree-sitter-python.wasm";
      break;
    case "typescript":
    default:
      wasmFileName = "tree-sitter-typescript.wasm";
      break;
  }

  const wasmPath = path.resolve(rootDir, "node_modules", "tree-sitter-wasms", "out", wasmFileName);

  if (!fs.existsSync(wasmPath)) {
    throw new Error(`Tree-sitter WASM file not found at: ${wasmPath}`);
  }

  const lang = await Parser.Language.load(wasmPath);
  loadedLanguages.set(language, lang);
  return lang;
}

export function inferLanguageFromPath(filePath: string): "typescript" | "tsx" | "javascript" | "python" | "unknown" {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".cts":
    case ".mts":
      return "typescript";
    case ".tsx":
      return "tsx";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".py":
    case ".pyw":
      return "python";
    default:
      return "unknown";
  }
}

