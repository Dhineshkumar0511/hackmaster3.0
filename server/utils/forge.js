
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
        try {
            if (stats.hasPackageJson) {
                buildLogs.push({ type: 'cmd', text: '> npm install --production 2>&1' });
                try {
                    const { stdout, stderr } = await execAsync(`cd "${clonePath}" && npm install --production 2>&1`, { timeout: 45000 });
                    const output = (stdout || stderr || '').trim();
                    const lines = output.split('\n').slice(-5); // last 5 lines
                    lines.forEach(l => buildLogs.push({ type: 'info', text: l }));
                    buildLogs.push({ type: 'success', text: '✅ npm install successful' });
                    stats.buildSuccess = true;
                } catch (buildErr) {
                    buildLogs.push({ type: 'error', text: `❌ npm install failed: ${(buildErr.message || '').substring(0, 150)}` });
                    stats.buildSuccess = false;
                }
            } else if (stats.hasRequirementsTxt) {
                buildLogs.push({ type: 'cmd', text: '> pip install -r requirements.txt --dry-run 2>&1' });
                try {
                    const { stdout } = await execAsync(`pip install -r "${path.join(clonePath, 'requirements.txt')}" --dry-run 2>&1`, { timeout: 30000 });
                    const lines = (stdout || '').trim().split('\n').slice(-5);
                    lines.forEach(l => buildLogs.push({ type: 'info', text: l }));
                    buildLogs.push({ type: 'success', text: '✅ pip dependencies verified' });
                    stats.buildSuccess = true;
                } catch (buildErr) {
                    buildLogs.push({ type: 'error', text: `❌ pip check failed: ${(buildErr.message || '').substring(0, 150)}` });
                    stats.buildSuccess = false;
                }
            }
        } catch (_) { /* build check is optional */ }

        return {
            success: true,
            clonePath,
            stats,
            buildLogs,
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
