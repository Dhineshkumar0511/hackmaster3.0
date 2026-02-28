
/**
 * 🚀 HackMaster 3.0 — Advanced GitHub Repository Analyzer
 * Deep-scans repos, prioritizes relevant code files, reads MORE content.
 * Designed to give the AI evaluator maximum context for accurate scoring.
 */

const GITHUB_API = 'https://api.github.com';

// File extensions grouped by relevance priority
const CODE_EXTENSIONS = {
    high: ['.py', '.ipynb', '.jsx', '.tsx', '.js', '.ts'],
    medium: ['.sql', '.r', '.java', '.cpp', '.c', '.go', '.rs', '.dart', '.kt', '.swift'],
    low: ['.html', '.css', '.scss', '.sass', '.less', '.xml', '.yaml', '.yml', '.toml'],
    config: ['.json', '.env.example', '.dockerfile', 'Dockerfile', '.sh'],
};

// Directories to always skip
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', '__pycache__', '.next',
    '.cache', 'coverage', '.vscode', '.idea', 'venv', '.venv',
    'env', '.env', 'eggs', '.eggs', 'vendor', 'bower_components',
    '.tox', '.pytest_cache', '.mypy_cache', 'htmlcov', 'assets',
    'images', 'img', 'fonts', 'static/images', 'public/images',
]);

// Important filenames to always include
const IMPORTANT_FILES = new Set([
    'readme.md', 'readme.txt', 'requirements.txt', 'setup.py', 'setup.cfg',
    'pyproject.toml', 'package.json', 'docker-compose.yml', 'dockerfile',
    'makefile', 'procfile', '.env.example', 'main.py', 'app.py', 'server.py',
    'index.js', 'index.ts', 'app.js', 'app.ts', 'manage.py',
]);

function getFilePriority(filePath, fileName) {
    const lower = fileName.toLowerCase();
    const pathLower = filePath.toLowerCase();

    // Highest priority: README, main entry points
    if (IMPORTANT_FILES.has(lower)) return 0;

    // High priority: source code in src/, app/, core/ directories
    const inCoreDirs = /\/(src|app|core|lib|api|routes|models|services|controllers|components|utils|helpers|modules)\//i.test(pathLower);

    for (const ext of CODE_EXTENSIONS.high) {
        if (lower.endsWith(ext)) return inCoreDirs ? 1 : 2;
    }
    for (const ext of CODE_EXTENSIONS.medium) {
        if (lower.endsWith(ext)) return inCoreDirs ? 2 : 3;
    }
    for (const ext of CODE_EXTENSIONS.config) {
        if (lower.endsWith(ext)) return 4;
    }
    for (const ext of CODE_EXTENSIONS.low) {
        if (lower.endsWith(ext)) return 5;
    }
    return 6;
}

function isCodeFile(fileName) {
    const lower = fileName.toLowerCase();
    const allExts = [
        ...CODE_EXTENSIONS.high,
        ...CODE_EXTENSIONS.medium,
        ...CODE_EXTENSIONS.low,
        ...CODE_EXTENSIONS.config,
    ];
    return allExts.some(ext => lower.endsWith(ext)) || IMPORTANT_FILES.has(lower);
}

async function githubFetch(url, headers) {
    try {
        const res = await fetch(url, { headers });
        if (res.status === 403) {
            const remaining = res.headers.get('x-ratelimit-remaining');
            if (remaining === '0') {
                console.warn('⚠️ GitHub API rate limit reached');
                return null;
            }
        }
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(`GitHub fetch error for ${url}:`, e.message);
        return null;
    }
}

/**
 * Main function: Fetches and analyzes a GitHub repository
 * Returns structured data for AI evaluation
 */
export async function fetchGithubRepoContent(githubUrl) {
    console.log(`🚀 [GitHub Analyzer] Deep scanning: ${githubUrl}`);
    const startTime = Date.now();

    try {
        // Parse owner/repo from URL
        // Remove trailing slash, .git, and /tree/branch-name pattern
        let cleaned = githubUrl.replace(/\/$/, '').replace(/\.git$/, '');
        // Remove /tree/any-branch-name from the URL
        cleaned = cleaned.replace(/\/tree\/[^\/]+$/, '');
        // Remove /blob/any-branch-name from the URL
        cleaned = cleaned.replace(/\/blob\/[^\/]+$/, '');
        
        const parts = cleaned.split('/');
        const repo = parts.pop();
        const owner = parts.pop();

        if (!owner || !repo) {
            console.error('Invalid GitHub URL:', githubUrl);
            return null;
        }

        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'HackMaster-v3-Deep-Evaluator'
        };
        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        // ---- PHASE 0: Get Repo Metadata (Identity Verification) ----
        const [repoData, contributorsData] = await Promise.all([
            githubFetch(`${GITHUB_API}/repos/${owner}/${repo}`, headers),
            githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/contributors`, headers)
        ]);

        const meta = {
            owner: repoData?.owner?.login || owner,
            createdAt: repoData?.created_at || 'unknown',
            updatedAt: repoData?.updated_at || 'unknown',
            contributors: Array.isArray(contributorsData) ? contributorsData.map(c => c.login) : [],
            description: repoData?.description || ''
        };

        // ---- PHASE 1: Get full repo tree in ONE API call ----
        // This is much more efficient than recursive directory listing
        const treeData = await githubFetch(
            `${GITHUB_API}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
            headers
        );

        let allItems = [];
        let fileTree = [];

        if (treeData && treeData.tree) {
            // Process tree data
            const dirs = new Set();
            for (const item of treeData.tree) {
                // Track directories
                const dirParts = item.path.split('/');
                for (let i = 1; i < dirParts.length; i++) {
                    dirs.add(dirParts.slice(0, i).join('/'));
                }

                if (item.type === 'blob') {
                    const fileName = item.path.split('/').pop();
                    const dirPath = item.path.split('/').slice(0, -1).join('/');

                    // Skip files in ignored directories
                    const pathSegments = item.path.toLowerCase().split('/');
                    if (pathSegments.some(seg => SKIP_DIRS.has(seg))) continue;

                    fileTree.push(`📄 ${item.path}`);

                    if (isCodeFile(fileName) && item.size < 300000) {
                        allItems.push({
                            path: item.path,
                            name: fileName,
                            size: item.size,
                            download_url: `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${item.path}`,
                            priority: getFilePriority(item.path, fileName),
                        });
                    }
                }
            }

            // Add directory entries to tree
            const sortedDirs = Array.from(dirs).sort();
            const treeLines = [];
            for (const dir of sortedDirs) {
                const segments = dir.toLowerCase().split('/');
                if (!segments.some(seg => SKIP_DIRS.has(seg))) {
                    treeLines.push(`📁 ${dir}/`);
                }
            }
            // Combine dirs and files, sorted
            fileTree = [...treeLines, ...fileTree].sort();

        } else {
            // Fallback: recursive directory listing (slower, uses more API calls)
            console.log('⚠️ Tree API failed, falling back to recursive listing...');
            let queue = [''];
            let apiCalls = 0;

            while (queue.length > 0 && apiCalls < 50) {
                const path = queue.shift();
                apiCalls++;

                const items = await githubFetch(
                    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
                    headers
                );
                if (!Array.isArray(items)) continue;

                for (const item of items) {
                    if (item.type === 'dir') {
                        if (!SKIP_DIRS.has(item.name.toLowerCase())) {
                            fileTree.push(`📁 ${item.path}/`);
                            queue.push(item.path);
                        }
                    } else {
                        fileTree.push(`📄 ${item.path}`);
                        if (isCodeFile(item.name) && item.size < 300000) {
                            allItems.push({
                                path: item.path,
                                name: item.name,
                                size: item.size,
                                download_url: item.download_url,
                                priority: getFilePriority(item.path, item.name),
                            });
                        }
                    }
                }
            }
        }

        // ---- PHASE 2: Sort by priority and read more files ----
        allItems.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.size - b.size; // smaller files first (more likely to be focused)
        });

        // Read up to 30 files, with generous content limits
        const MAX_FILES = 30;
        const MAX_CHARS_PER_FILE = 8000;
        const MAX_TOTAL_CHARS = 120000; // ~120K chars total context

        let totalChars = 0;
        let fileContents = [];
        let analyzedCount = 0;

        for (const file of allItems) {
            if (analyzedCount >= MAX_FILES) break;
            if (totalChars >= MAX_TOTAL_CHARS) break;

            try {
                const res = await fetch(file.download_url);
                if (!res.ok) continue;

                let text = await res.text();

                // For .ipynb files, extract code cells
                if (file.name.endsWith('.ipynb')) {
                    try {
                        const nb = JSON.parse(text);
                        const codeCells = (nb.cells || [])
                            .filter(c => c.cell_type === 'code')
                            .map(c => (Array.isArray(c.source) ? c.source.join('') : c.source))
                            .join('\n\n');
                        const markdownCells = (nb.cells || [])
                            .filter(c => c.cell_type === 'markdown')
                            .map(c => (Array.isArray(c.source) ? c.source.join('') : c.source))
                            .join('\n');
                        text = `# Notebook Markdown:\n${markdownCells.substring(0, 2000)}\n\n# Notebook Code:\n${codeCells}`;
                    } catch (e) {
                        // If parsing fails, use raw text
                    }
                }

                // Trim to max per file
                const trimmed = text.substring(0, MAX_CHARS_PER_FILE);
                const wasTruncated = text.length > MAX_CHARS_PER_FILE;

                fileContents.push({
                    path: file.path,
                    content: trimmed,
                    size: file.size,
                    truncated: wasTruncated,
                    linesCount: trimmed.split('\n').length,
                });

                totalChars += trimmed.length;
                analyzedCount++;
            } catch (e) {
                console.warn(`Failed to read ${file.path}:`, e.message);
            }
        }

        // ---- PHASE 3: Build structured context for AI ----
        // Group files by directory for better AI understanding
        const dirGroups = {};
        for (const fc of fileContents) {
            const dir = fc.path.includes('/') ? fc.path.split('/').slice(0, -1).join('/') : '(root)';
            if (!dirGroups[dir]) dirGroups[dir] = [];
            dirGroups[dir].push(fc);
        }

        // Build full context string
        let fullContext = '';
        for (const [dir, files] of Object.entries(dirGroups)) {
            fullContext += `\n\n${'='.repeat(60)}\n📁 DIRECTORY: ${dir}\n${'='.repeat(60)}\n`;
            for (const f of files) {
                fullContext += `\n--- FILE: ${f.path} (${f.linesCount} lines, ${f.size} bytes${f.truncated ? ', TRUNCATED' : ''}) ---\n`;
                fullContext += f.content;
                fullContext += '\n';
            }
        }

        // Build a summary of what was found
        const summary = {
            totalFilesInRepo: fileTree.length,
            codeFilesFound: allItems.length,
            filesAnalyzed: analyzedCount,
            totalCharsRead: totalChars,
            filesByType: {},
            directories: Object.keys(dirGroups),
        };

        // Count files by extension
        for (const item of allItems) {
            const ext = item.name.includes('.') ? '.' + item.name.split('.').pop().toLowerCase() : 'unknown';
            summary.filesByType[ext] = (summary.filesByType[ext] || 0) + 1;
        }

        const elapsed = Date.now() - startTime;
        console.log(`✅ [GitHub Analyzer] Done in ${elapsed}ms — ${analyzedCount} files read (${(totalChars / 1024).toFixed(1)}KB), ${allItems.length} code files found`);

        return {
            fullContext,
            fileTree,
            fileContents, // structured array
            stats: summary,
            repoInfo: { owner, repo, ...meta },
        };

    } catch (e) {
        console.error('🔴 GitHub Analyzer Error:', e);
        return null;
    }
}
