import React, { useState } from 'react';
import { useAppContext } from '../../App';

export default function AdminSubmissions() {
    const {
        teams, submissions, useCases, evaluationResults,
        fetchEvaluations, deleteSubmission, deleteAllSubmissions, showToast,
        selectedBatch, setSelectedBatch, batches
    } = useAppContext();
    const [selectedReport, setSelectedReport] = useState(null);
    const [evaluatingId, setEvaluatingId] = useState(null);
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [filterTeam, setFilterTeam] = useState('all');
    const [filterPhase, setFilterPhase] = useState('all');
    const [forgeData, setForgeData] = useState(null); // Storage for technical audit
    const [isForging, setIsForging] = useState(null);
    const [terminalLogs, setTerminalLogs] = useState([]);
    const [overrideValues, setOverrideValues] = useState({ score: 80, feedback: '' });
    const [forgeSubmission, setForgeSubmission] = useState(null); // Track which submission forge is running on

    const findUseCase = (useCaseId) => {
        return (useCases || []).find(u => u.id === useCaseId);
    };

    const handleEvaluate = async (submission) => {
        setEvaluatingId(submission.id);
        try {
            const useCase = findUseCase(submission.use_case_id);
            const requirement = useCase?.requirements?.[submission.requirement_number - 1] || 'Unknown';

            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/evaluations/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    submissionId: submission.id,
                    useCaseTitle: useCase?.title || 'Unknown',
                    useCaseObjective: useCase?.objective || '',
                    domainChallenge: useCase?.domainChallenge || '',
                    requirementText: `R${submission.requirement_number}: ${requirement}`,
                    githubUrl: submission.github_url,
                    phase: submission.phase,
                    allRequirements: useCase?.requirements || []
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Evaluation failed');

            // Start Polling for Job Status
            const jobId = data.jobId;
            let pollCount = 0;
            const poll = setInterval(async () => {
                pollCount++;
                try {
                    const statusRes = await fetch(`/api/evaluations/status/${jobId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!statusRes.ok) {
                        if (statusRes.status === 404) {
                            clearInterval(poll);
                            showToast('❌ Evaluation job not found. Please try again.', 'error');
                            setEvaluatingId(null);
                            return;
                        }
                        throw new Error(`Server error: ${statusRes.status}`);
                    }

                    const job = await statusRes.json();

                    if (job.status === 'completed') {
                        clearInterval(poll);
                        showToast(`✅ Evaluation complete for Team #${submission.team_number}`, 'success');
                        fetchEvaluations();
                        setEvaluatingId(null);
                    } else if (job.status === 'failed') {
                        clearInterval(poll);
                        showToast(`❌ Evaluation failed: ${job.error || 'Unknown error'}`, 'error');
                        setEvaluatingId(null);
                    } else if (pollCount > 60) { // 1 minute timeout
                        clearInterval(poll);
                        showToast('⌛ Evaluation timed out. Try again later.', 'error');
                        setEvaluatingId(null);
                    }
                } catch (e) {
                    console.error('Polling error:', e);
                    clearInterval(poll);
                    showToast(`❌ Error checking evaluation status: ${e.message}`, 'error');
                    setEvaluatingId(null);
                }
            }, 2000); // Poll every 2 seconds

        } catch (error) {
            showToast(error.message, 'error');
            setEvaluatingId(null);
        }
    };

    const handleForge = async (submission) => {
        setIsForging(submission.id);
        setForgeSubmission(submission);
        setForgeData(null);
        setSelectedReport(null); // Close report modal — forge is separate

        // Clean the GitHub URL for display
        let cleanUrl = submission.github_url;
        if (cleanUrl && !cleanUrl.startsWith('http')) {
            cleanUrl = `https://github.com/${cleanUrl.replace(/^\//, '')}`;
        }
        // Strip /tree/branch or /blob/branch from display URL too
        cleanUrl = cleanUrl.replace(/\/tree\/[^\/]+\/?$/, '').replace(/\/blob\/[^\/]+\/?$/, '');

        setTerminalLogs([
            { type: 'info', text: `> Initializing Forge Nexus Audit for Submission #${submission.id}...` },
            { type: 'cmd', text: `> git clone --depth 1 ${cleanUrl} /tmp/forge_cache` }
        ]);

        try {
            const token = localStorage.getItem('hackmaster_token');
            let fullGithubUrl = cleanUrl;

            // Simulated progress for UI feel
            setTimeout(() => setTerminalLogs(prev => [...prev, { type: 'info', text: '📦 Receiving objects...' }]), 500);
            setTimeout(() => setTerminalLogs(prev => [...prev, { type: 'info', text: '🔨 Scanning project structure...' }]), 1000);

            const res = await fetch('/api/admin-system/forge/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    submissionId: submission.id,
                    githubUrl: fullGithubUrl
                }),
            });
            const isJson = res.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await res.json() : { message: 'Server returned non-JSON error. Check console.' };

            if (!res.ok) throw new Error(data.message || data.error || 'Forge failed');

            // Show rich detection results in terminal
            const s = data.stats;
            const newLogs = [
                { type: 'success', text: '✅ Repository Cloned and Verified.' },
                { type: 'info', text: `📊 Files scanned: ${s.totalFiles}` },
                { type: 'info', text: `🏷️ Project Type: ${s.projectType?.join(' + ') || 'Generic'}` },
            ];
            if (s.frameworks?.length > 0) newLogs.push({ type: 'info', text: `⚙️ Frameworks: ${s.frameworks.join(', ')}` });
            if (s.languages?.length > 0) newLogs.push({ type: 'info', text: `💻 Languages: ${s.languages.map(l => `${l.name}(${l.count})`).join(', ')}` });
            if (s.hasFrontend) newLogs.push({ type: 'info', text: '🎨 Frontend: DETECTED' });
            if (s.hasBackend) newLogs.push({ type: 'info', text: '🖥️ Backend: DETECTED' });
            if (s.hasML) newLogs.push({ type: 'info', text: '🧠 ML/AI: DETECTED' });
            if (s.hasMobile) newLogs.push({ type: 'info', text: '📱 Mobile: DETECTED' });
            if (s.hasDocker) newLogs.push({ type: 'info', text: '🐳 Docker: DETECTED' });
            if (s.hasDatabase) newLogs.push({ type: 'info', text: '🗄️ Database: DETECTED' });
            if (s.hasTests) newLogs.push({ type: 'info', text: '🧪 Tests: DETECTED' });
            if (s.hasCI) newLogs.push({ type: 'info', text: '🔄 CI/CD: DETECTED' });

            // Append build logs from server
            if (data.buildLogs?.length > 0) {
                newLogs.push({ type: 'info', text: '─── Build Verification ───' });
                newLogs.push(...data.buildLogs);
            }

            newLogs.push({ type: 'success', text: '> System Audit Complete. Awaiting Manual Review.' });
            setTerminalLogs(prev => [...prev, ...newLogs]);

            setForgeData(data);
            const evalResult = evaluationResults[`sub_${submission.id}`];
            setOverrideValues({ score: evalResult?.total_score || 80, feedback: 'Verified build and code structure. High technical integrity.' });
        } catch (error) {
            setTerminalLogs(prev => [...prev, { type: 'error', text: `❌ ERROR: ${error.message}` }]);
            showToast(error.message, 'error');
        } finally {
            setIsForging(null);
        }
    };

    const handleUpdateScore = async (submissionId) => {
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/admin-system/override', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    submissionId,
                    score: overrideValues.score,
                    feedback: overrideValues.feedback,
                    forgeLogs: terminalLogs || []
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast('✅ Score Overridden Successfully', 'success');
            setForgeData(null);
            setSelectedReport(null);
            setTerminalLogs([]);
            fetchEvaluations();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // ... handleEvaluateAll and filteredSubmissions logic ...

    const ReportModal = ({ sub, report }) => {
        if (!sub || !report) return null;
        let details = [];
        try {
            details = typeof report.detailed_report === 'string' ? JSON.parse(report.detailed_report) : (report.detailed_report || []);
        } catch (e) { console.error('JSON Parse error', e); }

        return (
            <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div className="modal-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="mark-circle" style={{ width: '50px', height: '50px', background: report.plagiarism_risk !== 'Low' || !report.identity_verified ? 'rgba(255, 61, 113, 0.2)' : 'var(--primary)', border: report.plagiarism_risk !== 'Low' || !report.identity_verified ? '2px solid var(--accent-red)' : '2px solid var(--primary-light)' }}>{report.total_score}</div>
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    AI Technical Audit — Team #{sub.team_number}
                                    {report.plagiarism_risk !== 'Low' && <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>🔥 PLAGIARISM: {report.plagiarism_risk}</span>}
                                    {!report.identity_verified && <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>🆔 IDENTITY MISMATCH</span>}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub.phase} • GitHub: {sub.github_url.split('/').pop()}</p>
                            </div>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReport(null)}>CLOSE</button>
                    </div>

                    <div className="modal-body" style={{ padding: 'var(--space-xl)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                            <div className="glass-card" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{report.code_quality}%</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Code Quality</div>
                                <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.1)', marginTop: '8px', borderRadius: '2px' }}>
                                    <div style={{ height: '100%', width: `${report.code_quality}%`, background: 'var(--accent-cyan)', borderRadius: '2px' }}></div>
                                </div>
                            </div>
                            <div className="glass-card" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-green)' }}>{report.req_satisfaction}%</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Requirement Satisfaction</div>
                                <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.1)', marginTop: '8px', borderRadius: '2px' }}>
                                    <div style={{ height: '100%', width: `${report.req_satisfaction}%`, background: 'var(--accent-green)', borderRadius: '2px' }}></div>
                                </div>
                            </div>
                            <div className="glass-card" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-orange)' }}>{report.innovation}%</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Innovation Level</div>
                                <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.1)', marginTop: '8px', borderRadius: '2px' }}>
                                    <div style={{ height: '100%', width: `${report.innovation}%`, background: 'var(--accent-orange)', borderRadius: '2px' }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', borderLeft: '4px solid var(--primary)' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>🤖 AI Summary Feedback</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6 }}>{report.feedback}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-xl)', alignItems: 'start' }}>
                            <div>
                                <h4 style={{ marginBottom: 'var(--space-md)' }}>📋 Requirement Breakdown</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                    {Array.isArray(details) && details.map((r, i) => (
                                        <div key={i} className="glass-card" style={{ padding: 'var(--space-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.req}</div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: r.score >= 80 ? 'var(--accent-green)' : r.score >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>{r.score}%</span>
                                                    <span className={`badge ${r.status === 'Met' ? 'badge-success' : r.status === 'Partial' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.6rem' }}>{r.status}</span>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>{r.explanation}</p>

                                            {r.filesFound && r.filesFound.length > 0 && (
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                    {r.filesFound.map((file, k) => (
                                                        <span key={k} style={{
                                                            fontSize: '0.6rem',
                                                            background: 'rgba(0, 212, 255, 0.1)',
                                                            color: 'var(--accent-cyan)',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            border: '1px solid rgba(0, 212, 255, 0.2)',
                                                            fontFamily: 'var(--font-mono)'
                                                        }}>📄 {file.split('/').pop()}</span>
                                                    ))}
                                                </div>
                                            )}

                                            {r.mistakes && r.mistakes.length > 0 && (
                                                <div style={{ background: 'rgba(255, 61, 113, 0.1)', padding: '8px', borderRadius: '4px' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-red)', marginBottom: '4px' }}>MISTAKES / IMPROVEMENTS:</div>
                                                    {r.mistakes.map((m, j) => <div key={j} style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>• {m}</div>)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 style={{ marginBottom: 'var(--space-md)' }}>📂 Repository Structure</h4>
                                <div className="folder-tree" style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: 'var(--space-lg)',
                                    borderRadius: 'var(--radius-md)',
                                    maxHeight: '600px',
                                    overflowY: 'auto'
                                }}>
                                    {(() => {
                                        try {
                                            const tree = typeof report.file_tree === 'string' ? JSON.parse(report.file_tree) : report.file_tree;
                                            if (!Array.isArray(tree) || tree.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No tree data available.</div>;
                                            return tree.map((line, i) => {
                                                const lineStr = String(line || '');
                                                return (
                                                    <div key={i} style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: '0.75rem',
                                                        color: lineStr.startsWith('📁') ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                                                        marginBottom: '2px',
                                                        whiteSpace: 'pre'
                                                    }}>
                                                        {lineStr}
                                                    </div>
                                                );
                                            });
                                        } catch (e) {
                                            return <div style={{ color: 'var(--accent-red)' }}>Error loading tree.</div>;
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Separate Forge Terminal Panel (standalone overlay)
    const ForgePanel = () => {
        if (!forgeSubmission && terminalLogs.length === 0) return null;
        const sub = forgeSubmission;
        if (!sub) return null;

        return (
            <div className="modal-overlay" onClick={() => { setForgeSubmission(null); setForgeData(null); setTerminalLogs([]); }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
                    <div className="modal-header">
                        <div>
                            <h3 style={{ margin: 0 }}>🔧 Forge Nexus Audit — Team #{sub.team_number}</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub.phase} • {sub.team_name || `Team ${sub.team_number}`}</p>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setForgeSubmission(null); setForgeData(null); setTerminalLogs([]); }}>CLOSE</button>
                    </div>
                    <div className="modal-body" style={{ padding: 'var(--space-lg)' }}>
                        {/* Terminal Window */}
                        <div style={{
                            background: '#0D1117',
                            border: '1px solid #30363D',
                            borderRadius: '8px',
                            padding: '15px',
                            marginBottom: '20px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            color: '#C9D1D9'
                        }}>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F56' }}></div>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E' }}></div>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27C93F' }}></div>
                                <span style={{ fontSize: '0.6rem', color: '#8B949E', marginLeft: '10px', fontFamily: 'var(--font-mono)' }}>forge-audit-v1.0.exe</span>
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: '1.4' }}>
                                {Array.isArray(terminalLogs) && terminalLogs.map((log, i) => (
                                    <div key={i} style={{
                                        color: log.type === 'error' ? '#FF7B72' : log.type === 'success' ? '#3FB950' : log.type === 'cmd' ? '#79C0FF' : '#C9D1D9',
                                        marginBottom: '4px'
                                    }}>
                                        {log.text}
                                    </div>
                                ))}
                                {isForging && <div style={{ color: '#C9D1D9', animation: 'blink 1s infinite' }}>_</div>}
                            </div>
                        </div>

                        {/* Forge Results + Override Controls */}
                        {forgeData && (
                            <div>
                                {/* Verified Badge */}
                                <div style={{ 
                                    display: 'flex', alignItems: 'center', gap: '10px', 
                                    padding: '12px 16px', marginBottom: '16px',
                                    background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,212,255,0.05))',
                                    border: '1px solid rgba(0,255,136,0.3)', borderRadius: '8px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#3FB950', fontSize: '0.85rem' }}>FORGE VERIFIED</div>
                                        <div style={{ fontSize: '0.7rem', color: '#8B949E' }}>
                                            {forgeData.stats?.projectType?.join(' + ')} • {forgeData.stats?.totalFiles} files
                                            {forgeData.stats?.buildSuccess !== undefined && (forgeData.stats.buildSuccess ? ' • Build OK ✅' : ' • Build Failed ❌')}
                                        </div>
                                    </div>
                                </div>

                                {/* Project Type & Frameworks */}
                                {forgeData.stats?.frameworks?.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                        {forgeData.stats.frameworks.map((fw, i) => (
                                            <span key={i} style={{
                                                fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px',
                                                background: 'rgba(108,99,255,0.15)', color: 'var(--primary-light)', border: '1px solid rgba(108,99,255,0.3)'
                                            }}>{fw}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Detection Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                                    {[
                                        { label: 'FILES', value: forgeData.stats?.totalFiles || 0, active: true, color: 'var(--accent-cyan)' },
                                        { label: 'FRONTEND', value: forgeData.stats?.hasFrontend ? '✅' : '—', active: forgeData.stats?.hasFrontend, color: '#FF6BC1' },
                                        { label: 'BACKEND', value: forgeData.stats?.hasBackend ? '✅' : '—', active: forgeData.stats?.hasBackend, color: '#79C0FF' },
                                        { label: 'ML/AI', value: forgeData.stats?.hasML ? '✅' : '—', active: forgeData.stats?.hasML, color: '#D2A8FF' },
                                        { label: 'DATABASE', value: forgeData.stats?.hasDatabase ? '✅' : '—', active: forgeData.stats?.hasDatabase, color: '#FFA657' },
                                        { label: 'DOCKER', value: forgeData.stats?.hasDocker ? '✅' : '—', active: forgeData.stats?.hasDocker, color: '#79C0FF' },
                                        { label: 'TESTS', value: forgeData.stats?.hasTests ? '✅' : '—', active: forgeData.stats?.hasTests, color: '#3FB950' },
                                        { label: 'CI/CD', value: forgeData.stats?.hasCI ? '✅' : '—', active: forgeData.stats?.hasCI, color: '#FFA657' },
                                        { label: 'DOCS', value: forgeData.stats?.hasReadme ? '✅' : '—', active: forgeData.stats?.hasReadme, color: '#3FB950' },
                                        { label: 'MOBILE', value: forgeData.stats?.hasMobile ? '✅' : '—', active: forgeData.stats?.hasMobile, color: '#FF6BC1' },
                                    ].map((item, i) => (
                                        <div key={i} style={{
                                            textAlign: 'center', padding: '10px 6px', borderRadius: '8px',
                                            background: item.active ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                                            border: `1px solid ${item.active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'}`,
                                            opacity: item.active ? 1 : 0.4,
                                        }}>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: item.active ? item.color : '#8B949E' }}>{item.value}</div>
                                            <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#8B949E', letterSpacing: '0.5px' }}>{item.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Languages Bar */}
                                {forgeData.stats?.languages?.length > 0 && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8B949E', marginBottom: '6px', letterSpacing: '1px' }}>LANGUAGES</div>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {forgeData.stats.languages.slice(0, 8).map((lang, i) => (
                                                <span key={i} style={{
                                                    fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px',
                                                    background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)',
                                                    border: '1px solid rgba(0,212,255,0.2)', fontFamily: 'var(--font-mono)'
                                                }}>{lang.name} ({lang.count})</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Key Files List */}
                                {forgeData.stats?.keyFiles?.length > 0 && (
                                    <details style={{ marginBottom: '16px' }}>
                                        <summary style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', cursor: 'pointer', marginBottom: '6px' }}>
                                            📂 Key Source Files ({forgeData.stats.keyFiles.length})
                                        </summary>
                                        <div style={{
                                            background: '#0D1117', borderRadius: '6px', padding: '10px',
                                            maxHeight: '200px', overflowY: 'auto', border: '1px solid #30363D',
                                            marginTop: '6px'
                                        }}>
                                            {forgeData.stats.keyFiles.map((f, i) => (
                                                <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#C9D1D9', padding: '2px 0' }}>
                                                    {f.includes('/') || f.includes('\\') ? '├── ' : '📄 '}{f}
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}

                                {/* Override Controls */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid #30363D' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>MASTER OVERRIDE SCORE:</label>
                                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '1.1rem' }}>{overrideValues.score}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={overrideValues.score} onChange={e => setOverrideValues({ ...overrideValues, score: parseInt(e.target.value) })} style={{ width: '100%', accentColor: 'var(--accent-cyan)', height: '15px' }} />
                                    <input className="form-input" placeholder="Enter manual audit feedback..." value={overrideValues.feedback} onChange={e => setOverrideValues({ ...overrideValues, feedback: e.target.value })} style={{ marginTop: '10px', fontSize: '0.75rem', background: '#0D1117', border: '1px solid #30363D', color: '#fff' }} />
                                    <button className="btn btn-primary btn-sm" onClick={() => { handleUpdateScore(sub.id); setForgeSubmission(null); }} style={{ marginTop: '12px', width: '100%', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))', fontSize: '0.8rem', padding: '10px' }}>🛠️ APPLY HUMAN VERIFIED MASTER SCORE</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const handleEvaluateAll = async () => {
        const pending = filteredSubmissions.filter(s => !evaluationResults[`sub_${s.id}`]);
        for (const sub of pending) {
            await handleEvaluate(sub);
            await new Promise(r => setTimeout(r, 1000));
        }
    };

    const filteredSubmissions = submissions.filter(s => {
        if (filterTeam !== 'all' && String(s.team_id) !== filterTeam) return false;
        if (filterPhase !== 'all' && s.phase !== filterPhase) return false;
        return true;
    });

    const pendingCount = filteredSubmissions.filter(s => !evaluationResults[`sub_${s.id}`]).length;

    return (
        <div>
            {selectedReport && <ReportModal sub={selectedReport.sub} report={selectedReport.report} />}
            {forgeSubmission && <ForgePanel />}
            <div className="page-header">
                <h2 className="gradient-text">📤 Submission Dashboard</h2>
                <p>Manage and evaluate all team submissions — Batch {selectedBatch}</p>
            </div>

            {/* Batch Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-xl)' }}>
                {batches.map(b => (
                    <button key={b.id} onClick={() => { setSelectedBatch(b.id); setFilterTeam('all'); }} style={{
                        padding: '10px 24px', borderRadius: '12px',
                        border: selectedBatch === b.id ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                        background: selectedBatch === b.id ? 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' : 'rgba(255,255,255,0.05)',
                        color: selectedBatch === b.id ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}>🎓 {b.label}</button>
                ))}
            </div>

            <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(0, 245, 160, 0.15)' }}>📤</div><div className="stat-value" style={{ color: 'var(--accent-green)' }}>{submissions.length}</div><div className="stat-label">Total Submissions</div></div>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(0, 212, 255, 0.15)' }}>✅</div><div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{Object.keys(evaluationResults).filter(k => k.startsWith('sub_')).length}</div><div className="stat-label">Evaluated</div></div>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(255, 140, 0, 0.15)' }}>⏳</div><div className="stat-value" style={{ color: 'var(--accent-orange)' }}>{pendingCount}</div><div className="stat-label">Pending AI Audit</div></div>
            </div>

            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                        <select className="form-input" value={filterTeam} onChange={e => setFilterTeam(e.target.value)} style={{ width: '220px' }}>
                            <option value="all">All {selectedBatch === '2027' ? '3rd Year' : '2nd Year'} Teams</option>
                            {teams.filter(t => submissions.some(s => s.team_id === t.id)).map(t => <option key={t.id} value={t.id}>Team {t.team_number} — {t.name}</option>)}
                        </select>
                        <select className="form-input" value={filterPhase} onChange={e => setFilterPhase(e.target.value)} style={{ width: '150px' }}>
                            <option value="all">All Phases</option>
                            <option value="Phase 1">Phase 1</option><option value="Phase 2">Phase 2</option><option value="Phase 3">Phase 3</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        {pendingCount > 0 && <button className="btn btn-primary btn-sm" onClick={handleEvaluateAll}>🤖 Evaluate All ({pendingCount})</button>}
                        <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteAll(true)}>🗑️ Delete All</button>
                    </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                    🤖 AI evaluation performs a deep technical audit on GitHub source code
                </p>
            </div>

            {showDeleteAll && (
                <div className="modal-overlay" onClick={() => setShowDeleteAll(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-body">
                            <div className="confirm-dialog"><div className="confirm-icon">⚠️</div><h3>Delete All?</h3><p>This will permanently remove all submissions and evaluations.</p>
                                <div className="confirm-actions"><button className="btn btn-secondary" onClick={() => setShowDeleteAll(false)}>Cancel</button><button className="btn btn-danger" onClick={() => { deleteAllSubmissions(); setShowDeleteAll(false); }}>🗑️ Delete All</button></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {filteredSubmissions.length === 0 ? (
                <div className="glass-card" style={{ padding: 'var(--space-2xl)' }}><div className="empty-state"><div className="empty-icon">📤</div><h3>No Submissions</h3></div></div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>#</th><th>Team</th><th>Phase</th><th>Req</th><th>GitHub</th><th>Time</th><th>Score</th><th>Actions</th></tr></thead>
                        <tbody>
                            {filteredSubmissions.map((sub, idx) => {
                                const evalResult = evaluationResults[`sub_${sub.id}`];
                                const isEvaluating = evaluatingId === sub.id;
                                return (
                                    <tr key={sub.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{idx + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ fontWeight: 600 }}>{sub.team_name || `Team ${sub.team_number}`}</div>
                                                {evalResult && evalResult.plagiarism_risk !== 'Low' && <span title={`Plagiarism Risk: ${evalResult.plagiarism_risk}`} style={{ cursor: 'help' }}>⚠️</span>}
                                                {evalResult && !evalResult.identity_verified && <span title="Identity Mismatch" style={{ cursor: 'help' }}>🆔</span>}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{sub.team_number}</div>
                                        </td>
                                        <td><span className="badge badge-info">{sub.phase}</span></td>
                                        <td><span className="badge badge-primary">R{sub.requirement_number}</span></td>
                                        <td><a href={sub.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', wordBreak: 'break-all' }}>{sub.github_url.replace('https://github.com/', '').substring(0, 35)}</a></td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(sub.timestamp).toLocaleString()}</td>
                                        <td>
                                            {isEvaluating ? <div className="spinner" style={{ width: '24px', height: '24px' }} />
                                                : evalResult ? <div className={`mark-circle ${evalResult.total_score >= 80 ? 'high' : evalResult.total_score >= 50 ? 'medium' : 'low'}`}
                                                    onClick={() => setSelectedReport({ sub, report: evalResult })}
                                                    style={{ width: '40px', height: '40px', fontSize: '0.8rem', cursor: 'pointer' }}>{evalResult.total_score}</div>
                                                    : <span className="badge badge-warning">Pending</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {!evalResult && !isEvaluating && <button className="btn btn-primary btn-sm" onClick={() => handleEvaluate(sub)} title="AI Evaluate">🤖</button>}
                                                {evalResult && <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReport({ sub, report: evalResult })} title="View Report">📊</button>}
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,255,136,0.1))', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.5px' }}
                                                    onClick={() => handleForge(sub)}
                                                    disabled={isForging === sub.id}
                                                    title="Forge Verify (Clone & Audit)"
                                                >
                                                    {isForging === sub.id ? '⏳' : '🔨 FORGE'}
                                                </button>
                                                {evalResult && <button className="btn btn-secondary btn-sm" style={{ opacity: 0.5 }} onClick={() => handleEvaluate(sub)}>🔄</button>}
                                                <button className="btn btn-danger btn-sm" onClick={() => deleteSubmission(sub.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
