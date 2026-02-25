import React, { useState } from 'react';
import { useAppContext } from '../../App';

export default function AdminSubmissions() {
    const { teams, submissions, useCases, evaluationResults, fetchEvaluations, deleteSubmission, deleteAllSubmissions, showToast } = useAppContext();
    const [evaluatingId, setEvaluatingId] = useState(null);
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [filterTeam, setFilterTeam] = useState('all');
    const [filterPhase, setFilterPhase] = useState('all');

    const handleEvaluate = async (submission) => {
        setEvaluatingId(submission.id);
        try {
            const useCase = useCases.find(u => u.id === submission.use_case_id);
            const requirement = useCase?.requirements?.[submission.requirement_number - 1] || 'Unknown';

            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    submissionId: submission.id,
                    useCaseTitle: useCase?.title || 'Unknown',
                    requirementText: `R${submission.requirement_number}: ${requirement}`,
                    githubUrl: submission.github_url,
                    phase: submission.phase,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Evaluation failed');

            showToast('✅ AI Evaluation complete!', 'success');
            fetchEvaluations();
        } catch (error) {
            showToast(error.message, 'error');
        }
        setEvaluatingId(null);
    };

    const handleEvaluateAll = async () => {
        const pending = filteredSubmissions.filter(s => !evaluationResults[s.id]);
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

    const pendingCount = filteredSubmissions.filter(s => !evaluationResults[s.id]).length;

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">📤 Submission Dashboard</h2>
                <p>Manage and evaluate all team submissions with Cerebras AI</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(0, 245, 160, 0.15)' }}>📤</div><div className="stat-value" style={{ color: 'var(--accent-green)' }}>{submissions.length}</div><div className="stat-label">Total</div></div>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(0, 212, 255, 0.15)' }}>✅</div><div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{Object.keys(evaluationResults).length}</div><div className="stat-label">Evaluated</div></div>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(255, 140, 0, 0.15)' }}>⏳</div><div className="stat-value" style={{ color: 'var(--accent-orange)' }}>{pendingCount}</div><div className="stat-label">Pending</div></div>
            </div>

            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                        <select className="form-input" value={filterTeam} onChange={e => setFilterTeam(e.target.value)} style={{ width: '200px' }}>
                            <option value="all">All Teams</option>
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
                    🔑 API key loaded from server <code style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>.env</code> file — no configuration needed
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
                                const evalResult = evaluationResults[sub.id];
                                const isEvaluating = evaluatingId === sub.id;
                                return (
                                    <tr key={sub.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{idx + 1}</td>
                                        <td><div style={{ fontWeight: 600 }}>{sub.team_name || `Team ${sub.team_number}`}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{sub.team_number}</div></td>
                                        <td><span className="badge badge-info">{sub.phase}</span></td>
                                        <td><span className="badge badge-primary">R{sub.requirement_number}</span></td>
                                        <td><a href={sub.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', wordBreak: 'break-all' }}>{sub.github_url.replace('https://github.com/', '').substring(0, 35)}</a></td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(sub.timestamp).toLocaleString()}</td>
                                        <td>
                                            {isEvaluating ? <div className="spinner" style={{ width: '24px', height: '24px' }} />
                                                : evalResult ? <div className={`mark-circle ${evalResult.total_score >= 80 ? 'high' : evalResult.total_score >= 50 ? 'medium' : 'low'}`} style={{ width: '40px', height: '40px', fontSize: '0.8rem' }}>{evalResult.total_score}</div>
                                                    : <span className="badge badge-warning">Pending</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {!evalResult && !isEvaluating && <button className="btn btn-primary btn-sm" onClick={() => handleEvaluate(sub)}>🤖</button>}
                                                {evalResult && <button className="btn btn-secondary btn-sm" onClick={() => handleEvaluate(sub)}>🔄</button>}
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
