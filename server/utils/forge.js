
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FORGE_BASE_DIR = path.resolve(__dirname, '../../temp_clones');

// Windows-safe directory removal with retries (handles EBUSY / lock files)
async function forceRemoveDir(dirPath, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await fs.rm(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
            return true;
        } catch (err) {
            if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'ENOTEMPTY') {
                console.log(`⏳ FORGE cleanup attempt ${attempt}/${maxRetries} — ${err.code}, retrying...`);
                // On Windows, kill any git processes that may be locking files
                try { await execAsync('taskkill /IM git.exe /F 2>nul', { timeout: 5000 }); } catch (_) { /* ignore */ }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Increasing backoff
            } else if (err.code === 'ENOENT') {
                return true; // Already gone
            } else {
                throw err;
            }
        }
    }
    // Last resort: use OS-level rmdir on Windows
    try {
        await execAsync(`rmdir /s /q "${dirPath}"`, { timeout: 10000 });
        return true;
    } catch (_) {
        console.warn(`⚠️ FORGE: Could not fully clean ${dirPath}, continuing anyway...`);
        return false;
    }
}

export async function forgeAudit(githubUrl, submissionId) {
    const clonePath = path.join(FORGE_BASE_DIR, `sub_${submissionId}`);

    try {
        // Enforce base dir exists
        await fs.mkdir(FORGE_BASE_DIR, { recursive: true });

        // Clean up previous attempt with robust Windows-safe removal
        await forceRemoveDir(clonePath);

        // Clean the GitHub URL — strip /tree/branch and /blob/branch
        let cleanUrl = githubUrl
            .replace(/\/tree\/[^\/]+\/?$/, '')
            .replace(/\/blob\/[^\/]+\/?$/, '')
            .replace(/\/$/, '');

        // Also strip /tree/branch/subpath patterns (e.g. /tree/main/src)
        cleanUrl = cleanUrl.replace(/\/tree\/[^\/]+\/.*$/, '');
        cleanUrl = cleanUrl.replace(/\/blob\/[^\/]+\/.*$/, '');

        console.log(`🔨 FORGE: Cloning ${cleanUrl} to temp storage...`);

        // Clone with shallow depth to be fast
        try {
            await execAsync(`git clone --depth 1 "${cleanUrl}" "${clonePath}"`, { timeout: 60000 });
        } catch (cloneErr) {
            // Parse the real git error (stderr contains the actual message)
            const stderr = (cloneErr.stderr || cloneErr.message || '').toString();
            if (stderr.includes('not found') || stderr.includes('Repository not found')) {
                throw new Error(`Repository not found: ${cleanUrl} — It may be private or deleted.`);
            } else if (stderr.includes('Authentication failed') || stderr.includes('could not read Username')) {
                throw new Error(`Authentication required: ${cleanUrl} — This is a private repository.`);
            } else if (stderr.includes('fatal:')) {
                // Extract just the fatal message
                const fatalMatch = stderr.match(/fatal:\s*(.+)/);
                throw new Error(fatalMatch ? fatalMatch[1].trim() : `Git clone failed for ${cleanUrl}`);
            } else {
                throw new Error(`Clone failed: ${cleanUrl} — ${stderr.substring(0, 200)}`);
            }
        }

        // Deep Scan: Analyze file structure and key indicators
        const stats = {
            hasPackageJson: false,
            hasRequirementsTxt: false,
            hasReadme: false,
            totalFiles: 0,
            languages: [],
            keyFiles: [],
            // Extended detection
            projectType: [],      // e.g. ['Frontend', 'Backend', 'ML/AI', 'Mobile']
            frameworks: [],       // e.g. ['React', 'Flask', 'TensorFlow']
            hasDocker: false,
            hasDatabase: false,
            hasTests: false,
            hasCI: false,
            hasFrontend: false,
            hasBackend: false,
            hasML: false,
            hasMobile: false,
            filesByExt: {},
        };

        const entries = await fs.readdir(clonePath, { recursive: true });
        // Filter out .git internals from the count
        const codeEntries = entries.filter(e => !e.startsWith('.git') && !e.includes('node_modules') && !e.includes('__pycache__'));
        stats.totalFiles = codeEntries.length;

        // Read package.json for framework detection
        let packageData = null;
        try {
            const pkgPath = path.join(clonePath, 'package.json');
            const pkgContent = await fs.readFile(pkgPath, 'utf-8');
            packageData = JSON.parse(pkgContent);
        } catch (_) { /* no package.json */ }

        for (const entry of codeEntries) {
            const fileName = path.basename(entry).toLowerCase();
            const ext = path.extname(entry).toLowerCase();

            // Count files by extension
            if (ext) stats.filesByExt[ext] = (stats.filesByExt[ext] || 0) + 1;

            // Core file detection
            if (fileName === 'package.json') stats.hasPackageJson = true;
            if (fileName === 'requirements.txt' || fileName === 'setup.py' || fileName === 'pyproject.toml') stats.hasRequirementsTxt = true;
            if (fileName === 'readme.md') stats.hasReadme = true;

            // Docker
            if (fileName === 'dockerfile' || fileName === 'docker-compose.yml' || fileName === 'docker-compose.yaml') stats.hasDocker = true;

            // Database
            if (fileName.includes('schema.sql') || fileName.includes('migration') || fileName.includes('.db') || fileName.includes('database')) stats.hasDatabase = true;
            if (ext === '.sql') stats.hasDatabase = true;

            // CI/CD
            if (entry.includes('.github/workflows') || fileName === '.gitlab-ci.yml' || fileName === 'Jenkinsfile') stats.hasCI = true;

            // Tests
            if (fileName.includes('.test.') || fileName.includes('.spec.') || fileName.includes('_test.') || entry.includes('__tests__') || entry.includes('tests/') || entry.includes('test/')) stats.hasTests = true;

            // Frontend detection
            if (['.jsx', '.tsx', '.vue', '.svelte', '.css', '.scss', '.sass', '.less'].includes(ext)) stats.hasFrontend = true;
            if (fileName === 'index.html' || fileName === 'vite.config.js' || fileName === 'next.config.js' || fileName === 'webpack.config.js' || fileName === 'tailwind.config.js') stats.hasFrontend = true;

            // Backend detection
            if (fileName === 'server.js' || fileName === 'app.js' || fileName === 'main.py' || fileName === 'app.py' || fileName === 'manage.py') stats.hasBackend = true;
            if (fileName === 'pom.xml' || fileName === 'build.gradle') stats.hasBackend = true;

            // ML/AI detection
            if (['.ipynb', '.h5', '.pkl', '.joblib', '.onnx'].includes(ext)) stats.hasML = true;
            if (fileName.includes('model') || fileName.includes('train') || fileName.includes('predict') || fileName.includes('dataset')) stats.hasML = true;

            // Mobile detection
            if (fileName === 'androidmanifest.xml' || fileName === 'podfile' || fileName === 'pubspec.yaml' || fileName === 'app.json') stats.hasMobile = true;
            if (ext === '.dart' || ext === '.swift' || ext === '.kt') stats.hasMobile = true;

            // Collect key source files
            if (stats.keyFiles.length < 30 && ['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.java', '.cpp', '.c', '.dart', '.vue', '.ipynb'].includes(ext)) {
                stats.keyFiles.push(entry);
            }
        }

        // Detect frameworks from package.json
        if (packageData) {
            const allDeps = { ...(packageData.dependencies || {}), ...(packageData.devDependencies || {}) };
            if (allDeps.react || allDeps['react-dom']) stats.frameworks.push('React');
            if (allDeps.next) stats.frameworks.push('Next.js');
            if (allDeps.vue) stats.frameworks.push('Vue.js');
            if (allDeps.angular || allDeps['@angular/core']) stats.frameworks.push('Angular');
            if (allDeps.express) stats.frameworks.push('Express.js');
            if (allDeps.fastify) stats.frameworks.push('Fastify');
            if (allDeps.tailwindcss) stats.frameworks.push('Tailwind CSS');
            if (allDeps.mongoose || allDeps.mongodb) { stats.frameworks.push('MongoDB'); stats.hasDatabase = true; }
            if (allDeps.mysql2 || allDeps.mysql) { stats.frameworks.push('MySQL'); stats.hasDatabase = true; }
            if (allDeps.pg) { stats.frameworks.push('PostgreSQL'); stats.hasDatabase = true; }
            if (allDeps.sequelize || allDeps.prisma || allDeps['@prisma/client']) stats.frameworks.push('ORM');
            if (allDeps.tensorflow || allDeps['@tensorflow/tfjs']) { stats.frameworks.push('TensorFlow.js'); stats.hasML = true; }
            if (allDeps.socket || allDeps['socket.io']) stats.frameworks.push('Socket.IO');
            if (allDeps.vite) stats.frameworks.push('Vite');
            if (allDeps.electron) { stats.frameworks.push('Electron'); stats.hasMobile = true; }
        }

        // Detect frameworks from requirements.txt
        try {
            const reqPath = path.join(clonePath, 'requirements.txt');
            const reqContent = await fs.readFile(reqPath, 'utf-8');
            const reqLower = reqContent.toLowerCase();
            if (reqLower.includes('flask')) stats.frameworks.push('Flask');
            if (reqLower.includes('django')) stats.frameworks.push('Django');
            if (reqLower.includes('fastapi')) stats.frameworks.push('FastAPI');
            if (reqLower.includes('tensorflow') || reqLower.includes('keras')) { stats.frameworks.push('TensorFlow'); stats.hasML = true; }
            if (reqLower.includes('torch') || reqLower.includes('pytorch')) { stats.frameworks.push('PyTorch'); stats.hasML = true; }
            if (reqLower.includes('scikit') || reqLower.includes('sklearn')) { stats.frameworks.push('Scikit-learn'); stats.hasML = true; }
            if (reqLower.includes('pandas')) { stats.frameworks.push('Pandas'); stats.hasML = true; }
            if (reqLower.includes('numpy')) stats.frameworks.push('NumPy');
            if (reqLower.includes('opencv') || reqLower.includes('cv2')) { stats.frameworks.push('OpenCV'); stats.hasML = true; }
            if (reqLower.includes('streamlit')) stats.frameworks.push('Streamlit');
            if (reqLower.includes('sqlalchemy')) { stats.frameworks.push('SQLAlchemy'); stats.hasDatabase = true; }
        } catch (_) { /* no requirements.txt */ }

        // Build project type summary
        if (stats.hasFrontend) stats.projectType.push('Frontend');
        if (stats.hasBackend) stats.projectType.push('Backend');
        if (stats.hasML) stats.projectType.push('ML/AI');
        if (stats.hasMobile) stats.projectType.push('Mobile');
        if (stats.hasDocker) stats.projectType.push('Docker');
        if (stats.projectType.length === 0) stats.projectType.push('Generic');

        // Build languages list from extensions
        const langMap = { '.js': 'JavaScript', '.jsx': 'React JSX', '.ts': 'TypeScript', '.tsx': 'React TSX', '.py': 'Python', '.java': 'Java', '.cpp': 'C++', '.c': 'C', '.dart': 'Dart', '.vue': 'Vue', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.ipynb': 'Jupyter', '.sql': 'SQL', '.kt': 'Kotlin', '.swift': 'Swift', '.rb': 'Ruby', '.go': 'Go', '.rs': 'Rust', '.php': 'PHP' };
        for (const [ext, count] of Object.entries(stats.filesByExt)) {
            if (langMap[ext] && count > 0) {
                stats.languages.push({ name: langMap[ext], count });
            }
        }
        stats.languages.sort((a, b) => b.count - a.count);

        // Try to run build/install commands and capture output
        const buildLogs = [];
        let venvPython = null; // Track venv python path for later execution

        try {
            if (stats.hasPackageJson) {
                buildLogs.push({ type: 'cmd', text: '> npm install --production 2>&1' });
                try {
                    const { stdout, stderr } = await execAsync(`npm install --production`, { timeout: 60000, cwd: clonePath });
                    const output = (stdout || stderr || '').trim();
                    const lines = output.split('\n').slice(-5);
                    lines.forEach(l => { if (l.trim()) buildLogs.push({ type: 'info', text: l }); });
                    buildLogs.push({ type: 'success', text: '✅ npm install successful' });
                    stats.buildSuccess = true;
                } catch (buildErr) {
                    buildLogs.push({ type: 'error', text: `❌ npm install failed: ${(buildErr.message || '').substring(0, 150)}` });
                    stats.buildSuccess = false;
                }
            } else if (stats.hasRequirementsTxt) {
                // Create a virtualenv and install deps so execution works
                const venvPath = path.join(clonePath, '.forge_venv');
                buildLogs.push({ type: 'cmd', text: '> python3 -m venv .forge_venv && pip install -r requirements.txt' });
                try {
                    // Detect python command (Render Linux uses python3; Windows uses python)
                    const isWin = process.platform === 'win32';
                    let pythonCmd = 'python3';
                    if (isWin) {
                        pythonCmd = 'python';
                    } else {
                        // On Linux: try python3 first, fall back to python
                        try {
                            await execAsync('python3 --version', { timeout: 5000 });
                            pythonCmd = 'python3';
                        } catch (_) {
                            pythonCmd = 'python';
                        }
                    }
                    // Create venv
                    await execAsync(`${pythonCmd} -m venv "${venvPath}"`, { timeout: 30000 });
                    // Determine venv python path
                    venvPython = isWin
                        ? path.join(venvPath, 'Scripts', 'python.exe')
                        : path.join(venvPath, 'bin', 'python');
                    // Install requirements in venv
                    const pipPath = isWin
                        ? path.join(venvPath, 'Scripts', 'pip.exe')
                        : path.join(venvPath, 'bin', 'pip');
                    const reqFile = path.join(clonePath, 'requirements.txt');
                    const { stdout, stderr } = await execAsync(
                        `"${pipPath}" install -r "${reqFile}" --quiet --no-warn-script-location 2>&1`,
                        { timeout: 90000 }
                    );
                    const output = ((stdout || '') + (stderr || '')).trim();
                    const lines = output.split('\n').slice(-5);
                    lines.forEach(l => { if (l.trim()) buildLogs.push({ type: 'info', text: l }); });
                    buildLogs.push({ type: 'success', text: '✅ pip install successful (venv created)' });
                    stats.buildSuccess = true;
                } catch (buildErr) {
                    const msg = (buildErr.stderr || buildErr.message || '').substring(0, 200);
                    buildLogs.push({ type: 'error', text: `❌ pip install failed: ${msg}` });
                    stats.buildSuccess = false;
                    venvPython = null; // fallback to system python
                }
            }
        } catch (_) { /* build check is optional */ }

        // ---- STEP: Execute main file and capture output ----
        const execResult = await forgeExecuteMain(clonePath, stats, venvPython);
        if (execResult.runLogs?.length > 0) {
            buildLogs.push({ type: 'info', text: '─── Code Execution ───' });
            buildLogs.push(...execResult.runLogs);
        }

        return {
            success: true,
            clonePath,
            stats,
            buildLogs,
            execResult,
            message: `✅ Forge Build Verification: Found ${stats.totalFiles} files. Project: ${stats.projectType.join(' + ')}. ${stats.frameworks.length > 0 ? 'Frameworks: ' + stats.frameworks.join(', ') : ''}`
        };

    } catch (error) {
        console.error('❌ FORGE FAILURE:', error.message);
        return {
            success: false,
            error: error.message,
            message: `❌ Forge Failed: ${error.message}`
        };
    }
}

export async function cleanupForge(submissionId) {
    const clonePath = path.join(FORGE_BASE_DIR, `sub_${submissionId}`);
    return forceRemoveDir(clonePath);
}

/**
 * 🚀 FORGE EXECUTE: Find and run the main entry point of the project
 * Captures output to verify requirements and detect runtime behavior.
 */
async function forgeExecuteMain(clonePath, stats, venvPython = null) {
    const runLogs = [];
    let mainFile = null;
    let runCommand = null;
    let language = null;
    // Use venv python if available (deps installed), else fall back to system python
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';
    const pythonExe = venvPython || systemPython;

    // ---- Detect entry point from README if available ----
    let readmeHint = '';
    try {
        const readmeContent = await fs.readFile(path.join(clonePath, 'README.md'), 'utf-8');
        // Look for run commands in README
        const runMatch = readmeContent.match(/(?:run|start|execute)[:\s]+[`'"](python[\s\S]{0,80}|node[\s\S]{0,80}|npm[\s\S]{0,80})[`'"]/i);
        if (runMatch) readmeHint = runMatch[1].trim();
    } catch (_) {}

    // ---- Python project ----
    if (stats.hasRequirementsTxt || stats.hasML) {
        language = 'python';
        const pythonCandidates = ['main.py', 'app.py', 'run.py', 'server.py', 'api.py', 'predict.py', 'inference.py', 'demo.py'];
        for (const candidate of pythonCandidates) {
            try {
                await fs.access(path.join(clonePath, candidate));
                mainFile = candidate;
                break;
            } catch (_) {}
        }

        // Also scan sub-folders if not found at root
        if (!mainFile) {
            try {
                const allFiles = await fs.readdir(clonePath, { recursive: true });
                const pyMain = allFiles.find(f => {
                    const base = path.basename(f).toLowerCase();
                    return (base === 'main.py' || base === 'app.py') && !f.includes('node_modules') && !f.includes('.git');
                });
                if (pyMain) mainFile = pyMain;
            } catch (_) {}
        }

        if (mainFile) {
            // If mainFile is in a subdirectory, compute full absolute path
            const mainAbsPath = mainFile.includes(path.sep) || mainFile.includes('/')
                ? path.join(clonePath, mainFile)
                : path.join(clonePath, mainFile);
            
            // Create a wrapper script that handles errors gracefully + mocks AI client imports
            const wrapperScript = path.join(clonePath, '.forge_wrapper.py');
            const wrapperCode = `#!/usr/bin/env python3
import sys
import traceback
import importlib.util
import types

# ---- Mock AI client libraries to prevent import/init crashes ----
# Student code like "client = Groq(api_key=...)" should NOT crash forge execution
# These mocks let the code import and initialize without calling real APIs

class MockAIClient:
    """Dummy AI client that accepts any kwargs"""
    def __init__(self, **kwargs):
        self.kwargs = kwargs
    
    def __getattr__(self, name):
        """Return dummy for any method call"""
        return lambda *args, **kwargs: MockAIClient()

# Create mock modules for common AI libraries
groq_module = types.ModuleType('groq')
groq_module.Groq = MockAIClient

openai_module = types.ModuleType('openai')
openai_module.OpenAI = MockAIClient
openai_module.AzureOpenAI = MockAIClient

google_module = types.ModuleType('google')
google_genai = types.ModuleType('genai')
google_genai.GenerativeModel = MockAIClient
google.genai = google_genai

anthropic_module = types.ModuleType('anthropic')
anthropic_module.Anthropic = MockAIClient

cohere_module = types.ModuleType('cohere')
cohere_module.Client = MockAIClient

huggingface_module = types.ModuleType('huggingface_hub')

mistral_module = types.ModuleType('mistralai')
mistral_module.Mistral = MockAIClient

together_module = types.ModuleType('together')
together_module.Together = MockAIClient

# Inject mocks into sys.modules so imports succeed
sys.modules['groq'] = groq_module
sys.modules['openai'] = openai_module
sys.modules['google'] = google_module
sys.modules['google.genai'] = google_genai
sys.modules['anthropic'] = anthropic_module
sys.modules['cohere'] = cohere_module
sys.modules['huggingface_hub'] = huggingface_module
sys.modules['mistralai'] = mistral_module
sys.modules['together'] = together_module

try:
    # Load the main module
    spec = importlib.util.spec_from_file_location("__forge_main__", "${mainAbsPath.replace(/\\/g, '\\\\')}")
    if spec and spec.loader:
        module = importlib.util.module_from_spec(spec)
        sys.modules["__forge_main__"] = module
        spec.loader.exec_module(module)
    else:
        raise ImportError(f"Could not load module from {spec}")
except Exception as e:
    print(f"\\n[FORGE ERROR] {type(e).__name__}: {e}")
    traceback.print_exc()
    sys.exit(1)
`;
            await fs.writeFile(wrapperScript, wrapperCode);
            runCommand = `"${pythonExe}" "${wrapperScript}"`;
        }
    }

    // ---- Node.js project ----
    if (!runCommand && stats.hasPackageJson) {
        language = 'node';
        let pkgData = null;
        try {
            pkgData = JSON.parse(await fs.readFile(path.join(clonePath, 'package.json'), 'utf-8'));
        } catch (_) {}

        const startScript = pkgData?.scripts?.start;
        const mainEntry = pkgData?.main;

        if (startScript && !startScript.includes('vite') && !startScript.includes('webpack') && !startScript.includes('react-scripts')) {
            // Start script exists and it's not a dev server
            mainFile = mainEntry || 'index.js';
            runCommand = `node "${path.join(clonePath, mainEntry || 'index.js')}"`;
        } else {
            // Try common entry points
            for (const candidate of ['index.js', 'server.js', 'app.js', 'main.js']) {
                try {
                    await fs.access(path.join(clonePath, candidate));
                    mainFile = candidate;
                    runCommand = `node "${path.join(clonePath, candidate)}"`;
                    break;
                } catch (_) {}
            }
        }
    }

    if (!runCommand) {
        runLogs.push({ type: 'warning', text: '⚠️ No executable entry point detected (no main.py / app.py / index.js found at root).' });
        return { ran: false, mainFile: null, output: '', exitSuccess: false, runLogs };
    }

    runLogs.push({ type: 'cmd', text: `> Executing: ${mainFile} (${language})` });
    runLogs.push({ type: 'info', text: '⏱ Running with 20-second timeout...' });

    try {
        const { stdout, stderr } = await execAsync(runCommand, {
            timeout: 20000,
            windowsHide: true,
            cwd: clonePath,  // Set working dir to repo root for relative path resolution
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                // ---- Realistic dummy API keys so student imports don't crash ----
                // Format per provider req; groq validates key prefix, etc.
                GROQ_API_KEY: process.env.GROQ_API_KEY || 'gsk_live_abcdef123456789abcdef123456789abcdef123456789',
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-proj-abcdef123456789abcdef123456789abcdef123456',
                GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyAbcdef123456789abcdef123456789abcdef1',
                GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || 'AIzaSyAbcdef123456789abcdef123456789abcdef2',
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'sk-ant-v1abcdef123456789abcdef123456789abcdef1',
                COHERE_API_KEY: process.env.COHERE_API_KEY || 'abcdef123456789abcdef123456789abcdef12345678',
                HF_TOKEN: process.env.HF_TOKEN || 'hf_abcdef123456789abcdef123456789abcdef1234567',
                HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || 'hf_abcdef123456789abcdef123456789abcdef1234567',
                MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || 'abcdef123456789abcdef123456789abcdef12345678',
                TOGETHER_API_KEY: process.env.TOGETHER_API_KEY || 'abcdef123456789abcdef123456789abcdef12345678',
                REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN || 'abcdef123456789abcdef123456789abcdef12345678',
                PINECONE_API_KEY: process.env.PINECONE_API_KEY || 'abcdef12-abcd-abcd-abcd-abcdef123456',
                WEAVIATE_API_KEY: process.env.WEAVIATE_API_KEY || 'abcdef123456789abcdef123456789abcdef12345678',
                CHROMA_API_KEY: process.env.CHROMA_API_KEY || 'abcdef123456789abcdef123456789abcdef12345678',
                LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY || 'abcdef123456789abcdef123456789abcdef12345678',
                SUPABASE_KEY: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.dummy',
                SUPABASE_URL: process.env.SUPABASE_URL || 'https://dummy-proj.supabase.co',
                FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || 'AIzaSyAbcdef123456789abcdef123456789abcdef3',
                SECRET_KEY: process.env.SECRET_KEY || 'dummy_secret_forge_key_hackmaster_6e7f8g9h0i',
                API_KEY: process.env.API_KEY || 'dummy_api_key_forge_abcdef123456789abcdef1',
                DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db',
                REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379/0',
                PORT: '8080',
                DEBUG: '1',
            }
        });

        const rawOutput = ((stdout || '') + (stderr || '')).trim();
        const trimmedOutput = rawOutput.substring(0, 3000);
        const lines = trimmedOutput.split('\n').slice(0, 15);

        runLogs.push({ type: 'success', text: `✅ Execution completed (${rawOutput.length} bytes output)` });
        lines.forEach(l => { if (l.trim()) runLogs.push({ type: 'output', text: l }); });
        if (rawOutput.length > 3000) runLogs.push({ type: 'info', text: `... (output truncated at 3000 chars)` });

        return { ran: true, mainFile, output: trimmedOutput, exitSuccess: true, runLogs };

    } catch (runErr) {
        const rawOutput = ((runErr.stdout || '') + (runErr.stderr || runErr.message || '')).trim();
        const trimmedOutput = rawOutput.substring(0, 2000);
        const lines = trimmedOutput.split('\n').slice(0, 10);

        if (runErr.killed || (runErr.message || '').includes('timeout')) {
            runLogs.push({ type: 'warning', text: '⏰ Execution timed out (20s) — process killed. This may be normal for servers/APIs.' });
            // Still have partial output
            lines.forEach(l => { if (l.trim()) runLogs.push({ type: 'output', text: l }); });
            return { ran: true, mainFile, output: trimmedOutput + '\n[TIMEOUT - process killed after 20s]', exitSuccess: false, runLogs, timedOut: true };
        }

        runLogs.push({ type: 'error', text: `❌ Execution error: ${(runErr.message || '').substring(0, 150)}` });
        lines.forEach(l => { if (l.trim()) runLogs.push({ type: 'output', text: l }); });
        return { ran: true, mainFile, output: trimmedOutput, exitSuccess: false, runLogs };
    }
}
