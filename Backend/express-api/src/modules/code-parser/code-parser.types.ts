export interface Location {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface ImportSymbol {
  source: string;
  defaultImport?: string;
  namedImports: string[];
  namespaceImport?: string;
  location: Location;
}

export interface ExportSymbol {
  name: string;
  isDefault: boolean;
  location: Location;
}

export interface ParameterSymbol {
  name: string;
  typeAnnotation?: string;
  defaultValue?: string;
}

export interface MethodSymbol {
  name: string;
  params: string[];
  returnType?: string;
  isAsync: boolean;
  visibility?: "public" | "private" | "protected";
  location: Location;
}

export interface FunctionSymbol {
  name: string;
  params: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  location: Location;
  children: CodeSymbol[];
}

export interface ClassSymbol {
  name: string;
  isExported: boolean;
  extendsClass?: string;
  implementsInterfaces: string[];
  members: (MethodSymbol | FunctionSymbol | TypeDeclarationSymbol)[];
  location: Location;
}

export interface TypeDeclarationSymbol {
  name: string;
  kind: "interface" | "typeAlias" | "enum";
  isExported: boolean;
  members: string[];
  location: Location;
}

export type CodeSymbol =
  | { type: "import"; symbol: ImportSymbol }
  | { type: "export"; symbol: ExportSymbol }
  | { type: "class"; symbol: ClassSymbol }
  | { type: "function"; symbol: FunctionSymbol }
  | { type: "method"; symbol: MethodSymbol }
  | { type: "typeDeclaration"; symbol: TypeDeclarationSymbol };

export interface ParsedSourceFile {
  filePath: string;
  language: "typescript" | "tsx" | "javascript" | "python" | "unknown";
  success: boolean;
  errors: string[];
  imports: ImportSymbol[];
  exports: ExportSymbol[];
  classes: ClassSymbol[];
  functions: FunctionSymbol[];
  typeDeclarations: TypeDeclarationSymbol[];
  symbols: CodeSymbol[];
}

export interface ParseOptions {
  code: string;
  filePath: string;
  language?: "typescript" | "tsx" | "javascript" | "python";
}

