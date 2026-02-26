import 'dotenv/config';

async function testFetch() {
    const owner = 'Dhineshkumar0511';
    const repo = 'Brain_tumor';
    const token = process.env.GITHUB_TOKEN;

    console.log('Testing with token prefix:', token ? token.substring(0, 7) : 'NONE');

    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Test-Agent'
    };
    if (token) headers['Authorization'] = `token ${token}`;

    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/`, { headers });
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('Success! Found', data.length, 'items');
            console.log('Limit:', res.headers.get('x-ratelimit-limit'));
            console.log('Remaining:', res.headers.get('x-ratelimit-remaining'));
        } else {
            const text = await res.text();
            console.log('Error:', text);
        }
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

testFetch();
