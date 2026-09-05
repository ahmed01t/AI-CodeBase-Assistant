import path from "path";
/**
 * Filter and ignore policy for repository ingestion.
 * Protects system security by excluding secrets, build directories, binary assets, and oversized files.
 */
export class IngestionFilter {
    maxSizeBytes;
    // Strict list of directory names to skip completely
    ignoredDirectories = new Set([
        "node_modules",
        ".git",
        "dist",
        "build",
        ".next",
        "coverage",
        ".venv",
        "venv",
        "__pycache__",
        "target",
        "vendor",
        ".idea",
        ".vscode",
        "out",
        "bin",
        "obj",
        ".cache",
        ".turbo",
    ]);
    // Binary, media, archive, and non-text file extensions to skip
    ignoredExtensions = new Set([
        // Images
        "png", "jpg", "jpeg", "gif", "ico", "svg", "webp", "bmp", "tiff", "avif",
        // Audio / Video
        "mp4", "webm", "mp3", "wav", "ogg", "mov", "avi", "flv", "mkv",
        // Archives & Compressed
        "zip", "tar", "gz", "7z", "rar", "bz2", "xz", "tgz",
        // Compiled Executables & Binaries
        "exe", "dll", "so", "dylib", "class", "pyc", "o", "obj", "pdf", "wasm", "jar", "war", "ear",
        // Fonts & Lock Files
        "ttf", "woff", "woff2", "eot", "otf", "lock", "ds_store",
    ]);
    // Secret file patterns that MUST NEVER be ingested under any circumstance
    secretPatterns = [
        /^\.env(\..*)?$/i,
        /.*\.pem$/i,
        /.*\.key$/i,
        /^id_rsa.*/i,
        /^id_ed25519.*/i,
        /.*credentials\.json$/i,
        /.*service-account.*\.json$/i,
        /.*\.pfx$/i,
        /.*\.p12$/i,
        /.*\.kdbx$/i,
        /^aws_credentials$/i,
        /.*\.secret$/i,
    ];
    constructor(options) {
        this.maxSizeBytes = options?.maxSizeBytes || 512000; // Default 500 KB limit
    }
    /**
     * Evaluates whether a file should be included for ingestion.
     * Returns true if file is safe text/code; false if ignored/skipped.
     */
    shouldIngestFile(filePath, size) {
        const segments = filePath.split("/");
        const fileName = segments[segments.length - 1] || "";
        // 1. Check directory ignore list
        for (const segment of segments.slice(0, -1)) {
            if (this.ignoredDirectories.has(segment.toLowerCase())) {
                return false;
            }
        }
        // 2. Check secret pattern protection (NEVER INGEST SECRETS)
        for (const pattern of this.secretPatterns) {
            if (pattern.test(fileName)) {
                return false;
            }
        }
        // 3. Check extension ignore list
        const ext = path.extname(fileName).toLowerCase().replace(/^\./, "");
        if (ext && this.ignoredExtensions.has(ext)) {
            return false;
        }
        // 4. Check maximum file size limit
        if (size !== undefined && size > this.maxSizeBytes) {
            return false;
        }
        return true;
    }
}
export const defaultIngestionFilter = new IngestionFilter();
