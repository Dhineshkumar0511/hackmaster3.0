
/**
 * Smart GitHub Repository Scraper
 * Optimized for performance and rate-limit safety.
 */
export async function fetchGithubRepoContent(githubUrl) {
    console.log(`🚀 [fetchGithubRepoContent] Scanning: ${githubUrl}`);
    try {
        const parts = githubUrl.replace(/\/$/, '').split('/');
        const repo = parts.pop();
        const owner = parts.pop();

        if (!owner || !repo) return null;

        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'HackMaster-v3-Evaluator'
        };
        if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;

        // Smart Scan: Focus on src folders and common code extensions
        const codeExtensions = ['.js', '.jsx', '.py', '.sql', '.html', '.css', '.ipynb'];
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'images', 'assets'];

        let allFiles = [];
        let fileTree = [];
        let queue = [''];
        let calls = 0;

        while (queue.length > 0 && calls < 300) {
            const path = queue.shift();
            calls++;
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

            const res = await fetch(apiUrl, { headers });
            if (!res.ok) continue;

            const items = await res.json();
            if (!Array.isArray(items)) continue;

            for (const item of items) {
                if (item.type === 'dir') {
                    if (!skipDirs.includes(item.name.toLowerCase())) {
                        fileTree.push(`📁 ${item.path}/`);
                        queue.push(item.path);
                    }
                } else {
                    fileTree.push(`📄 ${item.path}`);
                    if (codeExtensions.some(ext => item.name.toLowerCase().endsWith(ext))) {
                        if (item.size < 200000) allFiles.push(item);
                    }
                }
            }
        }

        // Read top 15 relevant files
        let codeContext = '';
        for (const file of allFiles.slice(0, 15)) {
            const res = await fetch(file.download_url);
            if (res.ok) {
                const text = await res.text();
                codeContext += `\n\n-- FILE: ${file.path} --\n${text.substring(0, 5000)}`;
            }
        }

        return {
            fullContext: codeContext,
            fileTree,
            stats: { totalItems: fileTree.length, codeFiles: allFiles.length, analyzedFiles: Math.min(allFiles.length, 15) }
        };

    } catch (e) {
        console.error('Scraper Error:', e);
        return null;
    }
}
