import React, { useState } from 'react';
import { useAppContext } from '../../App';

export default function AdminSubmissions() {
    const { teams, submissions, useCases, allUseCases, evaluationResults, fetchEvaluations, deleteSubmission, deleteAllSubmissions, showToast } = useAppContext();
    const [selectedReport, setSelectedReport] = useState(null);
    const [evaluatingId, setEvaluatingId] = useState(null);
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [filterTeam, setFilterTeam] = useState('all');
    const [filterPhase, setFilterPhase] = useState('all');

    const findUseCase = (useCaseId) => {
        return [...(allUseCases['2027'] || []), ...(allUseCases['2028'] || [])].find(u => u.id === useCaseId);
    };

    const handleEvaluate = async (submission) => {
        setEvaluatingId(submission.id);
        try {
            const useCase = findUseCase(submission.use_case_id);
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
                    allRequirements: useCase?.requirements || []
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

    // ... handleEvaluateAll and filteredSubmissions logic ...

    const ReportModal = ({ sub, report }) => {
        if (!sub || !report) return null;
        const details = typeof report.detailed_report === 'string' ? JSON.parse(report.detailed_report) : report.detailed_report;

        return (
            <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div className="modal-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="mark-circle" style={{ width: '50px', height: '50px' }}>{report.total_score}</div>
                            <div>
                                <h3 style={{ margin: 0 }}>AI Technical Audit — Team #{sub.team_number}</h3>
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
                </div>
            </div>
        );
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
            {selectedReport && <ReportModal sub={selectedReport.sub} report={selectedReport.report} />}
            <div className="page-header">
                <h2 className="gradient-text">📤 Submission Dashboard</h2>
                <p>Manage and evaluate all team submissions</p>
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
                                                : evalResult ? <div className={`mark-circle ${evalResult.total_score >= 80 ? 'high' : evalResult.total_score >= 50 ? 'medium' : 'low'}`}
                                                    onClick={() => setSelectedReport({ sub, report: evalResult })}
                                                    style={{ width: '40px', height: '40px', fontSize: '0.8rem', cursor: 'pointer' }}>{evalResult.total_score}</div>
                                                    : <span className="badge badge-warning">Pending</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {!evalResult && !isEvaluating && <button className="btn btn-primary btn-sm" onClick={() => handleEvaluate(sub)}>🤖</button>}
                                                {evalResult && <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReport({ sub, report: evalResult })}>📊</button>}
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
