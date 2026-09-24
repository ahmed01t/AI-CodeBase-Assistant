"use client";

import React, { useState } from "react";
import { Search, Sliders, FileCode } from "lucide-react";
import { useWorkspace } from "../../context/workspace-context";
import { api } from "../../lib/api-client";
import { Button } from "../../components/ui/button";
import { Card, Badge } from "../../components/ui/badge";
import { CodeBlock } from "../../components/chat/code-block";
import type { SearchResultChunk } from "../../types";

export default function SemanticSearchPage() {
  const { activeProject, activeRepo } = useWorkspace();
  const [query, setQuery] = useState("");
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResultChunk[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || !activeProject) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await api.searchCodebase({
        projectId: activeProject.id,
        repositoryId: activeRepo?.id,
        query: query.trim(),
        limit: 8,
        similarityThreshold,
      });

      if (data && data.results) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      console.warn("[Search] Search query warning:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Semantic RAG Code Search
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
          Perform cosine similarity searches directly against pgvector embeddings and inspect matched AST code chunks.
        </p>
      </div>

      {/* Search Bar & Threshold Controls */}
      <Card className="p-4 sm:p-5 mb-6 sm:mb-8 bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-xs">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter semantic query (e.g. 'JWT token verification', 'Tree-sitter WASM parser')..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <Button
              type="submit"
              loading={isSearching}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs px-5 cursor-pointer self-stretch sm:self-auto"
            >
              Search
            </Button>
          </div>

          {/* Slider for Similarity Threshold */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1 gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Similarity Threshold:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300">
                {Math.round(similarityThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-full sm:w-48 accent-indigo-500 cursor-pointer"
            />
          </div>
        </form>
      </Card>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {hasSearched ? `Matched Code Chunks (${results.length})` : "Ready to Search"}
          </h2>
        </div>

        {results.length === 0 && hasSearched && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
            No code chunks found exceeding the similarity threshold. Try lowering the threshold or refining your search terms.
          </div>
        )}

        {results.map((res, i) => (
          <Card key={i} className="p-4 sm:p-5 bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {res.metadata?.filePath || `chunk-${i + 1}`}
                </span>
                {res.metadata?.symbolName && (
                  <Badge variant="indigo" className="text-[10px]">
                    {res.metadata.symbolType || "symbol"}: {res.metadata.symbolName}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Badge variant="success">
                  {Math.round(res.similarity * 100)}% Similarity
                </Badge>
                {res.metadata?.startLine && (
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    Lines {res.metadata.startLine} - {res.metadata.endLine}
                  </span>
                )}
              </div>
            </div>

            <CodeBlock code={res.content} language={res.metadata?.language || "typescript"} />
          </Card>
        ))}
      </div>
    </div>
  );
}

