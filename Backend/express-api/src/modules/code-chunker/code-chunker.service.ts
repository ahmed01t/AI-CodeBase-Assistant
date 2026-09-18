import { codeParserService } from "../code-parser/code-parser.service.js";
import { inferLanguageFromPath } from "../code-parser/treesitter.engine.js";
import {
  ChunkFileResult,
  ChunkMetadata,
  ChunkOptions,
  CodeChunk
} from "./code-chunker.types.js";

export class CodeChunkerService {
  /**
   * Split a source file into logical, semantically meaningful chunks.
   * Uses AST symbols (functions, classes, methods) when available,
   * with fallback to line-based sliding window for raw text/unsupported files.
   */
  public async chunkFile(options: ChunkOptions): Promise<ChunkFileResult> {
    const { code, filePath } = options;
    const maxLines = options.maxLinesPerChunk || 60;
    const overlap = options.overlapLines || 10;
    const language = options.language || inferLanguageFromPath(filePath);

    const lines = code.split("\n");

    // Empty file check
    if (lines.length === 0 || code.trim() === "") {
      return {
        filePath,
        language,
        totalChunks: 0,
        chunks: []
      };
    }

    // Try AST-based parsing first if language is supported
    if (language !== "unknown") {
      const parsed = await codeParserService.parseCode({ code, filePath, language });
      if (parsed.success && parsed.symbols.length > 0) {
        const chunks = this.createASTChunks(lines, parsed, filePath, language);
        if (chunks.length > 0) {
          return {
            filePath,
            language,
            totalChunks: chunks.length,
            chunks
          };
        }
      }
    }

    // Fallback: Sliding window chunker
    const windowChunks = this.createSlidingWindowChunks(lines, filePath, language, maxLines, overlap);
    return {
      filePath,
      language,
      totalChunks: windowChunks.length,
      chunks: windowChunks
    };
  }

  /**
   * Slices code based on AST symbols (imports, classes, methods, functions, types).
   */
  private createASTChunks(
    lines: string[],
    parsed: any,
    filePath: string,
    language: string
  ): CodeChunk[] {
    const rawChunks: {
      content: string;
      startLine: number;
      endLine: number;
      metadata: ChunkMetadata;
    }[] = [];

    // 1. Group Imports into a single header chunk
    if (parsed.imports.length > 0) {
      const startLine = Math.min(...parsed.imports.map((i: any) => i.location.startLine));
      const endLine = Math.max(...parsed.imports.map((i: any) => i.location.endLine));
      const content = this.sliceLines(lines, startLine, endLine);

      if (content.trim()) {
        rawChunks.push({
          content,
          startLine,
          endLine,
          metadata: {
            filePath,
            language,
            symbolType: "import",
            symbolName: "imports",
            startLine,
            endLine
          }
        });
      }
    }

    // 2. Type Declarations (Interfaces, Types, Enums)
    for (const typeDecl of parsed.typeDeclarations) {
      const { startLine, endLine } = typeDecl.location;
      const content = this.sliceLines(lines, startLine, endLine);

      if (content.trim()) {
        rawChunks.push({
          content,
          startLine,
          endLine,
          metadata: {
            filePath,
            language,
            symbolType: "typeDeclaration",
            symbolName: typeDecl.name,
            startLine,
            endLine
          }
        });
      }
    }

    // 3. Classes and their Methods
    for (const cls of parsed.classes) {
      // If class has methods, create a chunk for each method
      if (cls.members && cls.members.length > 0) {
        for (const member of cls.members) {
          const { startLine, endLine } = member.location;
          const content = this.sliceLines(lines, startLine, endLine);

          if (content.trim()) {
            rawChunks.push({
              content,
              startLine,
              endLine,
              metadata: {
                filePath,
                language,
                symbolType: "method",
                symbolName: member.name,
                parentSymbol: cls.name,
                startLine,
                endLine
              }
            });
          }
        }
      } else {
        // Entire class if no sub-methods
        const { startLine, endLine } = cls.location;
        const content = this.sliceLines(lines, startLine, endLine);
        if (content.trim()) {
          rawChunks.push({
            content,
            startLine,
            endLine,
            metadata: {
              filePath,
              language,
              symbolType: "class",
              symbolName: cls.name,
              startLine,
              endLine
            }
          });
        }
      }
    }

    // 4. Standalone Functions
    for (const fn of parsed.functions) {
      const { startLine, endLine } = fn.location;
      const content = this.sliceLines(lines, startLine, endLine);

      if (content.trim()) {
        rawChunks.push({
          content,
          startLine,
          endLine,
          metadata: {
            filePath,
            language,
            symbolType: "function",
            symbolName: fn.name,
            startLine,
            endLine
          }
        });
      }
    }

    // Sort chunks by startLine and assign sequential chunkIndex
    rawChunks.sort((a, b) => a.startLine - b.startLine);

    return rawChunks.map((chunk, index) => ({
      chunkIndex: index,
      content: chunk.content,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      tokenEstimate: Math.ceil(chunk.content.length / 4),
      metadata: chunk.metadata
    }));
  }

  /**
   * Fallback: Slices code into overlapping line windows for plain text/unsupported files.
   */
  private createSlidingWindowChunks(
    lines: string[],
    filePath: string,
    language: string,
    maxLines: number,
    overlap: number
  ): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const step = Math.max(1, maxLines - overlap);
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i += step) {
      const startLine = i + 1;
      const endLine = Math.min(lines.length, i + maxLines);
      const content = this.sliceLines(lines, startLine, endLine);

      if (content.trim()) {
        chunks.push({
          chunkIndex,
          content,
          startLine,
          endLine,
          tokenEstimate: Math.ceil(content.length / 4),
          metadata: {
            filePath,
            language,
            symbolType: "text",
            startLine,
            endLine
          }
        });
        chunkIndex++;
      }

      if (endLine >= lines.length) break;
    }

    return chunks;
  }

  /**
   * 1-indexed line slicer helper.
   */
  private sliceLines(lines: string[], startLine: number, endLine: number): string {
    const startIndex = Math.max(0, startLine - 1);
    const endIndex = Math.min(lines.length, endLine);
    return lines.slice(startIndex, endIndex).join("\n");
  }
}

export const codeChunkerService = new CodeChunkerService();

