import { getLanguageGrammar, inferLanguageFromPath, initTreeSitter } from "./treesitter.engine.js";
export class CodeParserService {
    /**
     * Parse a source code string into structured application-level AST symbols.
     * Does NOT make network calls or interact with external storage.
     */
    async parseCode(options) {
        const { code, filePath } = options;
        const language = options.language || inferLanguageFromPath(filePath);
        if (language === "unknown") {
            return {
                filePath,
                language: "unknown",
                success: false,
                errors: [`Unsupported or unmapped file type for: ${filePath}`],
                imports: [],
                exports: [],
                classes: [],
                functions: [],
                typeDeclarations: [],
                symbols: []
            };
        }
        try {
            const ParserClass = await initTreeSitter();
            const grammar = await getLanguageGrammar(language);
            const parser = new ParserClass();
            parser.setLanguage(grammar);
            const tree = parser.parse(code);
            const rootNode = tree.rootNode;
            const errors = [];
            if (rootNode.hasError()) {
                errors.push("Syntax errors detected in source code");
            }
            if (language === "python") {
                return this.parsePythonAST(rootNode, filePath, code, errors);
            }
            else {
                return this.parseTypeScriptAST(rootNode, filePath, language, code, errors);
            }
        }
        catch (err) {
            return {
                filePath,
                language,
                success: false,
                errors: [err.message || "Unknown error occurred during parsing"],
                imports: [],
                exports: [],
                classes: [],
                functions: [],
                typeDeclarations: [],
                symbols: []
            };
        }
    }
    /**
     * Helper to convert 0-indexed Tree-sitter node positions into 1-indexed Location objects.
     */
    getNodeLocation(node) {
        return {
            startLine: node.startPosition.row + 1,
            startColumn: node.startPosition.column + 1,
            endLine: node.endPosition.row + 1,
            endColumn: node.endPosition.column + 1
        };
    }
    // =========================================================================
    // TypeScript & JavaScript AST Extractor
    // =========================================================================
    parseTypeScriptAST(rootNode, filePath, language, code, errors) {
        const imports = [];
        const exports = [];
        const classes = [];
        const functions = [];
        const typeDeclarations = [];
        const symbols = [];
        for (const child of rootNode.children) {
            this.processTSNode(child, false, imports, exports, classes, functions, typeDeclarations, symbols);
        }
        return {
            filePath,
            language,
            success: true,
            errors,
            imports,
            exports,
            classes,
            functions,
            typeDeclarations,
            symbols
        };
    }
    processTSNode(node, isExportedContext, imports, exports, classes, functions, typeDeclarations, symbols) {
        switch (node.type) {
            case "import_statement": {
                const imp = this.extractTSImport(node);
                if (imp) {
                    imports.push(imp);
                    symbols.push({ type: "import", symbol: imp });
                }
                break;
            }
            case "export_statement": {
                const isDefault = node.children.some((c) => c.type === "default");
                const expSymbol = this.extractTSExport(node, isDefault);
                if (expSymbol) {
                    exports.push(expSymbol);
                    symbols.push({ type: "export", symbol: expSymbol });
                }
                // Process inner declaration of the export statement
                for (const child of node.children) {
                    if (child.type === "class_declaration" ||
                        child.type === "function_declaration" ||
                        child.type === "interface_declaration" ||
                        child.type === "type_alias_declaration" ||
                        child.type === "enum_declaration" ||
                        child.type === "lexical_declaration") {
                        this.processTSNode(child, true, imports, exports, classes, functions, typeDeclarations, symbols);
                    }
                }
                break;
            }
            case "class_declaration": {
                const cls = this.extractTSClass(node, isExportedContext);
                if (cls) {
                    classes.push(cls);
                    symbols.push({ type: "class", symbol: cls });
                }
                break;
            }
            case "function_declaration": {
                const fn = this.extractTSFunction(node, isExportedContext);
                if (fn) {
                    functions.push(fn);
                    symbols.push({ type: "function", symbol: fn });
                }
                break;
            }
            case "interface_declaration":
            case "type_alias_declaration":
            case "enum_declaration": {
                const typeDecl = this.extractTSTypeDeclaration(node, isExportedContext);
                if (typeDecl) {
                    typeDeclarations.push(typeDecl);
                    symbols.push({ type: "typeDeclaration", symbol: typeDecl });
                }
                break;
            }
            case "lexical_declaration":
            case "variable_declaration": {
                // Look for const fn = () => {} or const fn = function() {}
                const fnSymbols = this.extractTSVariableFunctions(node, isExportedContext);
                for (const fn of fnSymbols) {
                    functions.push(fn);
                    symbols.push({ type: "function", symbol: fn });
                }
                break;
            }
            default:
                break;
        }
    }
    extractTSImport(node) {
        const sourceNode = node.childForFieldName("source") || node.children.find((c) => c.type === "string");
        if (!sourceNode)
            return null;
        const source = sourceNode.text.replace(/['"]/g, "");
        let defaultImport;
        const namedImports = [];
        let namespaceImport;
        for (const child of node.children) {
            if (child.type === "identifier") {
                defaultImport = child.text;
            }
            else if (child.type === "import_clause") {
                for (const clauseChild of child.children) {
                    if (clauseChild.type === "identifier") {
                        defaultImport = clauseChild.text;
                    }
                    else if (clauseChild.type === "named_imports") {
                        for (const spec of clauseChild.children) {
                            if (spec.type === "import_specifier") {
                                const aliasNode = spec.childForFieldName("alias");
                                const nameNode = spec.childForFieldName("name") || spec.children[0];
                                if (aliasNode) {
                                    namedImports.push(`${nameNode?.text} as ${aliasNode.text}`);
                                }
                                else if (nameNode) {
                                    namedImports.push(nameNode.text);
                                }
                            }
                        }
                    }
                    else if (clauseChild.type === "namespace_import") {
                        const alias = clauseChild.children.find((c) => c.type === "identifier");
                        if (alias)
                            namespaceImport = alias.text;
                    }
                }
            }
            else if (child.type === "named_imports") {
                for (const spec of child.children) {
                    if (spec.type === "import_specifier") {
                        const nameNode = spec.childForFieldName("name") || spec.children[0];
                        if (nameNode)
                            namedImports.push(nameNode.text);
                    }
                }
            }
        }
        return {
            source,
            defaultImport,
            namedImports,
            namespaceImport,
            location: this.getNodeLocation(node)
        };
    }
    extractTSExport(node, isDefault) {
        let name = isDefault ? "default" : "";
        const nameNode = node.childForFieldName("declaration")?.childForFieldName("name") ||
            node.children.find((c) => c.type === "identifier" || c.type === "type_identifier");
        if (nameNode) {
            name = nameNode.text;
        }
        else if (node.text.includes("export default")) {
            name = "default";
        }
        if (!name)
            name = "anonymous";
        return {
            name,
            isDefault,
            location: this.getNodeLocation(node)
        };
    }
    extractTSClass(node, isExported) {
        const nameNode = node.childForFieldName("name") || node.children.find((c) => c.type === "type_identifier" || c.type === "identifier");
        if (!nameNode)
            return null;
        const className = nameNode.text;
        let extendsClass;
        const implementsInterfaces = [];
        const members = [];
        for (const child of node.children) {
            if (child.type === "class_heritage" || child.type === "heritage_clause") {
                const text = child.text;
                if (text.includes("extends")) {
                    const match = text.match(/extends\s+([A-Za-z0-9_$.]+)/);
                    if (match)
                        extendsClass = match[1];
                }
                if (text.includes("implements")) {
                    const match = text.match(/implements\s+([A-Za-z0-9_$,\s]+)/);
                    if (match) {
                        match[1].split(",").forEach((i) => implementsInterfaces.push(i.trim()));
                    }
                }
            }
            else if (child.type === "class_body") {
                for (const bodyChild of child.children) {
                    if (bodyChild.type === "method_definition" || bodyChild.type === "abstract_method_signature") {
                        const method = this.extractTSMethod(bodyChild);
                        if (method)
                            members.push(method);
                    }
                }
            }
        }
        return {
            name: className,
            isExported,
            extendsClass,
            implementsInterfaces,
            members,
            location: this.getNodeLocation(node)
        };
    }
    extractTSMethod(node) {
        const nameNode = node.childForFieldName("name") || node.children.find((c) => c.type === "property_identifier" || c.type === "identifier");
        if (!nameNode)
            return null;
        const name = nameNode.text;
        const isAsync = node.children.some((c) => c.type === "async");
        let visibility;
        if (node.children.some((c) => c.type === "public" || c.text === "public"))
            visibility = "public";
        else if (node.children.some((c) => c.type === "private" || c.text === "private"))
            visibility = "private";
        else if (node.children.some((c) => c.type === "protected" || c.text === "protected"))
            visibility = "protected";
        const params = this.extractParams(node);
        const returnType = this.extractReturnType(node);
        return {
            name,
            params,
            returnType,
            isAsync,
            visibility,
            location: this.getNodeLocation(node)
        };
    }
    extractTSFunction(node, isExported) {
        const nameNode = node.childForFieldName("name") || node.children.find((c) => c.type === "identifier");
        if (!nameNode)
            return null;
        const name = nameNode.text;
        const isAsync = node.children.some((c) => c.type === "async");
        const params = this.extractParams(node);
        const returnType = this.extractReturnType(node);
        return {
            name,
            params,
            returnType,
            isAsync,
            isExported,
            location: this.getNodeLocation(node),
            children: []
        };
    }
    extractTSTypeDeclaration(node, isExported) {
        const nameNode = node.childForFieldName("name") || node.children.find((c) => c.type === "type_identifier" || c.type === "identifier");
        if (!nameNode)
            return null;
        const name = nameNode.text;
        let kind = "interface";
        if (node.type === "type_alias_declaration")
            kind = "typeAlias";
        else if (node.type === "enum_declaration")
            kind = "enum";
        const members = [];
        const bodyNode = node.childForFieldName("body") || node.children.find((c) => c.type === "object_type" || c.type === "interface_body" || c.type === "enum_body");
        if (bodyNode) {
            for (const child of bodyNode.children) {
                if (child.type === "property_signature" || child.type === "method_signature" || child.type === "enum_assignment" || child.type === "property_identifier") {
                    members.push(child.text.split("\n")[0].trim());
                }
            }
        }
        return {
            name,
            kind,
            isExported,
            members,
            location: this.getNodeLocation(node)
        };
    }
    extractTSVariableFunctions(node, isExported) {
        const result = [];
        const declarators = node.children.filter((c) => c.type === "variable_declarator");
        for (const decl of declarators) {
            const nameNode = decl.childForFieldName("name");
            const valueNode = decl.childForFieldName("value");
            if (nameNode && valueNode && (valueNode.type === "arrow_function" || valueNode.type === "function_expression")) {
                const isAsync = valueNode.children.some((c) => c.type === "async");
                const params = this.extractParams(valueNode);
                const returnType = this.extractReturnType(valueNode);
                result.push({
                    name: nameNode.text,
                    params,
                    returnType,
                    isAsync,
                    isExported,
                    location: this.getNodeLocation(node),
                    children: []
                });
            }
        }
        return result;
    }
    extractParams(node) {
        const paramsNode = node.childForFieldName("parameters") || node.children.find((c) => c.type === "formal_parameters" || c.type === "parameters");
        if (!paramsNode)
            return [];
        const params = [];
        for (const child of paramsNode.children) {
            if (child.type === "required_parameter" ||
                child.type === "optional_parameter" ||
                child.type === "identifier" ||
                child.type === "typed_parameter") {
                params.push(child.text.trim());
            }
        }
        return params;
    }
    extractReturnType(node) {
        const returnTypeNode = node.childForFieldName("return_type") || node.children.find((c) => c.type === "type_annotation");
        if (returnTypeNode) {
            return returnTypeNode.text.replace(/^:\s*/, "").trim();
        }
        return undefined;
    }
    // =========================================================================
    // Python AST Extractor
    // =========================================================================
    parsePythonAST(rootNode, filePath, code, errors) {
        const imports = [];
        const exports = [];
        const classes = [];
        const functions = [];
        const typeDeclarations = [];
        const symbols = [];
        for (const child of rootNode.children) {
            this.processPyNode(child, imports, exports, classes, functions, symbols);
        }
        return {
            filePath,
            language: "python",
            success: true,
            errors,
            imports,
            exports,
            classes,
            functions,
            typeDeclarations,
            symbols
        };
    }
    processPyNode(node, imports, exports, classes, functions, symbols) {
        switch (node.type) {
            case "import_statement": {
                const sourceNode = node.children.find((c) => c.type === "dotted_name" || c.type === "identifier");
                const source = sourceNode ? sourceNode.text : node.text.replace(/^import\s+/, "");
                const imp = {
                    source,
                    namedImports: [source],
                    location: this.getNodeLocation(node)
                };
                imports.push(imp);
                symbols.push({ type: "import", symbol: imp });
                break;
            }
            case "import_from_statement": {
                const sourceNode = node.childForFieldName("module_name") || node.children.find((c) => c.type === "dotted_name" || c.type === "identifier");
                const source = sourceNode ? sourceNode.text : "";
                const namedImports = [];
                for (const child of node.children) {
                    if (child.type === "dotted_name" || child.type === "aliased_import" || child.type === "import_list") {
                        if (child.type === "import_list") {
                            child.children.forEach((ic) => {
                                if (ic.type === "identifier" || ic.type === "aliased_import")
                                    namedImports.push(ic.text);
                            });
                        }
                        else if (sourceNode && child.startIndex !== sourceNode.startIndex) {
                            namedImports.push(child.text);
                        }
                    }
                }
                const imp = {
                    source,
                    namedImports,
                    location: this.getNodeLocation(node)
                };
                imports.push(imp);
                symbols.push({ type: "import", symbol: imp });
                break;
            }
            case "class_definition": {
                const cls = this.extractPyClass(node);
                if (cls) {
                    classes.push(cls);
                    symbols.push({ type: "class", symbol: cls });
                }
                break;
            }
            case "function_definition": {
                const fn = this.extractPyFunction(node);
                if (fn) {
                    functions.push(fn);
                    symbols.push({ type: "function", symbol: fn });
                }
                break;
            }
            case "decorated_definition": {
                const definitionChild = node.children.find((c) => c.type === "class_definition" || c.type === "function_definition");
                if (definitionChild) {
                    this.processPyNode(definitionChild, imports, exports, classes, functions, symbols);
                }
                break;
            }
            default:
                break;
        }
    }
    extractPyClass(node) {
        const nameNode = node.childForFieldName("name");
        if (!nameNode)
            return null;
        const className = nameNode.text;
        let extendsClass;
        const superclassesNode = node.childForFieldName("superclasses") || node.children.find((c) => c.type === "argument_list");
        if (superclassesNode) {
            const superClasses = superclassesNode.children.filter((c) => c.type === "identifier" || c.type === "attribute").map((c) => c.text);
            if (superClasses.length > 0) {
                extendsClass = superClasses.join(", ");
            }
        }
        const members = [];
        const bodyNode = node.childForFieldName("body") || node.children.find((c) => c.type === "block");
        if (bodyNode) {
            for (const child of bodyNode.children) {
                if (child.type === "function_definition" || (child.type === "decorated_definition" && child.children.some((c) => c.type === "function_definition"))) {
                    const fnNode = child.type === "decorated_definition" ? child.children.find((c) => c.type === "function_definition") : child;
                    if (fnNode) {
                        const method = this.extractPyMethod(fnNode);
                        if (method)
                            members.push(method);
                    }
                }
            }
        }
        return {
            name: className,
            isExported: true, // In Python all top-level symbols are accessible by default
            extendsClass,
            implementsInterfaces: [],
            members,
            location: this.getNodeLocation(node)
        };
    }
    extractPyMethod(node) {
        const nameNode = node.childForFieldName("name");
        if (!nameNode)
            return null;
        const name = nameNode.text;
        const isAsync = node.children.some((c) => c.type === "async" || c.text === "async");
        const params = this.extractPyParams(node);
        const returnType = this.extractPyReturnType(node);
        let visibility = "public";
        if (name.startsWith("__") && !name.endsWith("__")) {
            visibility = "private";
        }
        else if (name.startsWith("_")) {
            visibility = "protected";
        }
        return {
            name,
            params,
            returnType,
            isAsync,
            visibility,
            location: this.getNodeLocation(node)
        };
    }
    extractPyFunction(node) {
        const nameNode = node.childForFieldName("name");
        if (!nameNode)
            return null;
        const name = nameNode.text;
        const isAsync = node.children.some((c) => c.type === "async" || c.text === "async");
        const params = this.extractPyParams(node);
        const returnType = this.extractPyReturnType(node);
        return {
            name,
            params,
            returnType,
            isAsync,
            isExported: true,
            location: this.getNodeLocation(node),
            children: []
        };
    }
    extractPyParams(node) {
        const paramsNode = node.childForFieldName("parameters") || node.children.find((c) => c.type === "parameters");
        if (!paramsNode)
            return [];
        const params = [];
        for (const child of paramsNode.children) {
            if (child.type === "identifier" ||
                child.type === "typed_parameter" ||
                child.type === "default_parameter" ||
                child.type === "typed_default_parameter") {
                params.push(child.text.trim());
            }
        }
        return params;
    }
    extractPyReturnType(node) {
        const returnTypeNode = node.childForFieldName("return_type") || node.children.find((c) => c.type === "type");
        if (returnTypeNode) {
            return returnTypeNode.text.trim();
        }
        return undefined;
    }
}
export const codeParserService = new CodeParserService();
