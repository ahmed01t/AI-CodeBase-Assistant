import { getMongoDb } from "../../lib/mongodb.js";
import { codeChunkerService } from "../code-chunker/code-chunker.service.js";

export interface CodeSearchMatch {
  filePath: string;
  filename: string;
  matchedLine: number;
  startLine: number;
  endLine: number;
  snippet: string;
  symbolName?: string;
  score: number;
}

export interface SearchCodebaseOptions {
  repositoryId?: string;
  projectId?: string;
  query: string;
  limit?: number;
}

export interface FindFilesOptions {
  repositoryId?: string;
  projectId?: string;
  pattern: string;
  limit?: number;
}

export interface ReadFileOptions {
  repositoryId?: string;
  projectId?: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
}

export interface FileSymbolInfo {
  filePath: string;
  symbols: Array<{
    name: string;
    type: string;
    startLine: number;
    endLine: number;
  }>;
}

// Comprehensive list of English stop-words and conversational filler tokens
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
  "down", "during", "each", "explain", "few", "file", "files", "find", "for", "from", "further", "get",
  "getting", "give", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll",
  "he's", "help", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
  "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
  "just", "let", "let's", "like", "list", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
  "over", "own", "please", "project", "repo", "repository", "same", "shan't", "she", "she'd", "she'll",
  "she's", "should", "shouldn't", "show", "so", "some", "such", "tell", "than", "that", "that's", "the",
  "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
  "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "us", "value",
  "values", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what",
  "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why",
  "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your",
  "yours", "yourself", "yourselves", "example", "examples"
]);

/**
 * On-Demand Code Explorer Engine
 * Provides live search, symbol extraction, file inspection, and directory navigation
 * directly over repository source files cached in MongoDB.
 */
export class CodeExplorerService {
  /**
   * Extracts meaningful search keywords and code identifiers, eliminating stop words.
   */
  private extractSearchKeywords(query: string): string[] {
    // 1. Tokenize query by non-alphanumeric (keeping dots, underscores, dashes for filenames/identifiers)
    const rawTokens = query.split(/[^a-zA-Z0-9_.-]+/).filter((t) => t.length > 1);

    const keywords: string[] = [];
    for (const token of rawTokens) {
      const lower = token.toLowerCase();
      if (!STOP_WORDS.has(lower) && lower.length > 1) {
        keywords.push(token);
      }
    }

    return Array.from(new Set(keywords));
  }

  /**
   * Performs high-speed keyword, regex, symbol, and filename search across repository files.
   */
  public async searchCodebase(options: SearchCodebaseOptions): Promise<{
    results: CodeSearchMatch[];
    totalMatches: number;
  }> {
    const { repositoryId, projectId, query, limit = 6 } = options;
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { results: [], totalMatches: 0 };
    }

    const db = await getMongoDb();
    if (!db) {
      return { results: [], totalMatches: 0 };
    }

    const collection = db.collection("raw_files");

    // Base filter for repository / project isolation
    const baseFilter: Record<string, any> = {};
    if (repositoryId) baseFilter.repository_id = repositoryId;
    if (projectId) baseFilter.project_id = projectId;

    const lowerQuery = cleanQuery.toLowerCase();
    const isTechStackOrOverview =
      lowerQuery.includes("tech stack") ||
      lowerQuery.includes("stack") ||
      lowerQuery.includes("dependencies") ||
      lowerQuery.includes("what does this project do") ||
      lowerQuery.includes("what does this repository do") ||
      lowerQuery.includes("overview") ||
      lowerQuery.includes("package.json") ||
      lowerQuery.includes("readme");

    // Special handler: If user asks for tech stack or overview, boost key manifest files
    if (isTechStackOrOverview) {
      const manifestDocs = await collection
        .find({
          ...baseFilter,
          $or: [
            { filename: /^package\.json$/i },
            { filename: /^readme/i },
            { filename: /^requirements\.txt$/i },
            { filename: /^cargo\.toml$/i },
            { filename: /^tsconfig\.json$/i },
            { filename: /^app\.(ts|js|py)$/i },
            { filename: /^server\.(ts|js|py)$/i },
            { filename: /^main\.(ts|js|py)$/i }
          ],
        })
        .limit(4)
        .toArray();

      if (manifestDocs.length > 0) {
        const manifestMatches: CodeSearchMatch[] = manifestDocs.map((doc) => {
          const content = doc.content || "";
          const lines = content.split("\n");
          const endLine = Math.min(60, lines.length);
          return {
            filePath: doc.path,
            filename: doc.filename,
            matchedLine: 1,
            startLine: 1,
            endLine,
            snippet: lines.slice(0, endLine).join("\n"),
            symbolName: doc.filename,
            score: 20, // Maximum relevance for architectural questions
          };
        });

        return {
          results: manifestMatches.slice(0, limit),
          totalMatches: manifestMatches.length,
        };
      }
    }

    // Extract genuine code keywords, dropping all English stop words
    const keywords = this.extractSearchKeywords(cleanQuery);

    // If query was purely conversational (e.g., "from where are you getting these values?"),
    // do not match arbitrary files to prevent prompt pollution.
    if (keywords.length === 0) {
      return { results: [], totalMatches: 0 };
    }

    // Search files by content regex OR by path/filename matching
    const regexPattern = keywords
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const orClauses: any[] = [
      { content: { $regex: regexPattern, $options: "i" } },
      { path: { $regex: regexPattern, $options: "i" } },
      { filename: { $regex: regexPattern, $options: "i" } }
    ];

    const matchingDocs = await collection
      .find({
        ...baseFilter,
        $or: orClauses,
      })
      .limit(30)
      .project({ path: 1, filename: 1, content: 1, extension: 1 })
      .toArray();

    const matches: CodeSearchMatch[] = [];

    for (const doc of matchingDocs) {
      const content = doc.content || "";
      const lines = content.split("\n");

      // Check if file path or name explicitly matched any keyword
      let pathScore = 0;
      for (const kw of keywords) {
        if (new RegExp(kw, "i").test(doc.path)) {
          pathScore += 5;
        }
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let lineScore = pathScore;

        for (const kw of keywords) {
          const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
          if (re.test(line)) {
            lineScore += 3; // Word boundary match boost
          } else if (new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(line)) {
            lineScore += 1;
          }
        }

        // Boost score if line looks like a symbol definition
        if (/(export\s+)?(function|class|interface|type|const|let|var|def|async)\s+/i.test(line)) {
          lineScore += 3;
        }

        // Only register snippet if it has meaningful score
        if (lineScore >= 3) {
          const startLine = Math.max(1, i - 3);
          const endLine = Math.min(lines.length, i + 8);
          const snippet = lines.slice(startLine - 1, endLine).join("\n");

          const symbolMatch = line.match(/(?:function|class|interface|type|const|let|var|def)\s+([a-zA-Z0-9_$]+)/);
          const symbolName = symbolMatch ? symbolMatch[1] : undefined;

          matches.push({
            filePath: doc.path,
            filename: doc.filename,
            matchedLine: i + 1,
            startLine,
            endLine,
            snippet,
            symbolName,
            score: lineScore,
          });

          i += 6; // Skip forward past matched snippet block
        }
      }
    }

    // Sort matches by relevance score descending
    matches.sort((a, b) => b.score - a.score);

    const finalResults = matches.slice(0, limit);

    return {
      results: finalResults,
      totalMatches: matches.length,
    };
  }

  /**
   * Finds files matching a path pattern (e.g. *auth*, *.controller.ts).
   */
  public async findFiles(options: FindFilesOptions): Promise<string[]> {
    const { repositoryId, projectId, pattern, limit = 15 } = options;
    const db = await getMongoDb();
    if (!db) return [];

    const collection = db.collection("raw_files");
    const filter: Record<string, any> = {};
    if (repositoryId) filter.repository_id = repositoryId;
    if (projectId) filter.project_id = projectId;

    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    filter.path = { $regex: regexPattern, $options: "i" };

    const docs = await collection
      .find(filter)
      .limit(limit)
      .project({ path: 1 })
      .toArray();

    return docs.map((d) => d.path);
  }

  /**
   * Reads the full or sliced content of a specific code file.
   */
  public async readFileContent(options: ReadFileOptions): Promise<{
    filePath: string;
    content: string;
    startLine: number;
    endLine: number;
    totalLines: number;
  } | null> {
    const { repositoryId, projectId, filePath, startLine = 1, endLine } = options;
    const db = await getMongoDb();
    if (!db) return null;

    const collection = db.collection("raw_files");
    const filter: Record<string, any> = { path: filePath };
    if (repositoryId) filter.repository_id = repositoryId;
    if (projectId) filter.project_id = projectId;

    const doc = await collection.findOne(filter);
    if (!doc || !doc.content) {
      return null;
    }

    const lines = doc.content.split("\n");
    const totalLines = lines.length;
    const finalStart = Math.max(1, Math.min(startLine, totalLines));
    const finalEnd = endLine ? Math.min(endLine, totalLines) : totalLines;

    const slicedContent = lines.slice(finalStart - 1, finalEnd).join("\n");

    return {
      filePath: doc.path,
      content: slicedContent,
      startLine: finalStart,
      endLine: finalEnd,
      totalLines,
    };
  }

  /**
   * Uses Tree-sitter AST parser to extract structural symbol outline for a file.
   */
  public async getFileSymbols(options: {
    repositoryId?: string;
    projectId?: string;
    filePath: string;
  }): Promise<FileSymbolInfo | null> {
    const fileData = await this.readFileContent({
      repositoryId: options.repositoryId,
      projectId: options.projectId,
      filePath: options.filePath,
    });

    if (!fileData) return null;

    try {
      const chunkResult = await codeChunkerService.chunkFile({
        code: fileData.content,
        filePath: fileData.filePath,
      });

      const symbols = chunkResult.chunks.map((c) => ({
        name: c.metadata.symbolName || "block",
        type: c.metadata.symbolType || "code",
        startLine: c.metadata.startLine,
        endLine: c.metadata.endLine,
      }));

      return {
        filePath: fileData.filePath,
        symbols,
      };
    } catch {
      return {
        filePath: fileData.filePath,
        symbols: [],
      };
    }
  }

  /**
   * Lists directory structure or file hierarchy in the repository.
   */
  public async listDirectory(options: {
    repositoryId?: string;
    projectId?: string;
    dirPath?: string;
  }): Promise<string[]> {
    const { repositoryId, projectId, dirPath = "" } = options;
    const db = await getMongoDb();
    if (!db) return [];

    const collection = db.collection("raw_files");
    const filter: Record<string, any> = {};
    if (repositoryId) filter.repository_id = repositoryId;
    if (projectId) filter.project_id = projectId;

    if (dirPath) {
      filter.path = { $regex: `^${dirPath.replace(/\/$/, "")}/`, $options: "i" };
    }

    const docs = await collection.find(filter).project({ path: 1 }).toArray();
    return docs.map((d) => d.path);
  }
}

export const codeExplorerService = new CodeExplorerService();