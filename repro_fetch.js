import 'dotenv/config';

const codeExtensions = ['.js', '.jsx', '.py', '.html', '.css', '.sql', '.txt', '.md', '.tsx', '.ts', '.json', '.yaml', '.yml', '.toml', '.cfg', '.ini', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.rb', '.php', '.ipynb', '.r', '.scala', '.sh', '.bat'];
const skipFiles = ['package-lock.json', 'yarn.lock', '.gitignore', '.eslintrc.json', 'tsconfig.json'];
const skipDirs = ['node_modules', '.git', '__pycache__', '.next', 'dist', 'build', '.vscode', '.idea', 'venv', 'env', '.env'];

async function fetchGithubRepoContent(githubUrl) {
    try {
        const parts = githubUrl.replace(/\/$/, '').split('/');
        const repo = parts.pop();
        const owner = parts.pop();
        console.log(`Owner: ${owner}, Repo: ${repo}`);

        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'HackMaster-3.0-Evaluator'
        };
        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
            console.log('Using token:', process.env.GITHUB_TOKEN.substring(0, 7));
        }

        let allFiles = [];
        let fileTree = [];
        let totalCalls = 0;
        const MAX_CALLS = 100;

        async function fetchDir(dirPath) {
            totalCalls++;
            if (totalCalls > MAX_CALLS) return;

            const encodedPath = dirPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
            console.log(`Fetching: ${apiUrl}`);

            const response = await fetch(apiUrl, { headers });
            console.log(`Status: ${response.status}`);

            if (response.status === 403) throw new Error('403 Rate Limit');
            if (response.status === 404) throw new Error('404 Not Found');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const items = await response.json();
            for (const item of items) {
                if (item.type === 'dir') {
                    if (skipDirs.includes(item.name)) continue;
                    fileTree.push(`📁 ${item.path}/`);
                    await fetchDir(item.path);
                } else if (item.type === 'file') {
                    fileTree.push(`📄 ${item.path}`);
                    if (codeExtensions.some(ext => item.name.toLowerCase().endsWith(ext))) {
                        allFiles.push(item);
                    }
                }
            }
        }

        await fetchDir('');
        console.log(`Done. Found ${allFiles.length} files.`);
        return { fileTree, allFiles };
    } catch (e) {
        console.error('FAILED:', e.message);
        return null;
    }
}

fetchGithubRepoContent('https://github.com/Dhineshkumar0511/Brain_tumor');
