import React, { useState } from 'react';
import { useAppContext } from '../../App';

export default function TeamSubmission() {
    const { user, teams, submissions, addSubmission, evaluationResults, useCases } = useAppContext();
    const myTeam = teams.find(t => t.team_number === user?.teamNumber);
    const myUseCase = myTeam?.use_case_id ? useCases.find(u => u.id === myTeam.use_case_id) : null;
    const mySubmissions = submissions.filter(s => s.team_number === user?.teamNumber);

    const [formData, setFormData] = useState({ githubUrl: '', requirementNumber: '', description: '', phase: 'Phase 1' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.githubUrl || !formData.requirementNumber) return;
        addSubmission({
            githubUrl: formData.githubUrl,
            requirementNumber: parseInt(formData.requirementNumber),
            description: formData.description,
            phase: formData.phase,
            useCaseId: myTeam?.use_case_id,
        });
        setFormData({ githubUrl: '', requirementNumber: '', description: '', phase: formData.phase });
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">📤 My Submissions</h2>
                <p>Submit your GitHub URL for evaluation per requirement</p>
            </div>

            {myUseCase ? (
                <div className="glass-card submission-form-card">
                    <h3>🆕 New Submission</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="submission-grid">
                            <div className="form-group">
                                <label className="form-label">GitHub Repository URL</label>
                                <input className="form-input" type="url" placeholder="https://github.com/your-team/project" value={formData.githubUrl} onChange={e => setFormData({ ...formData, githubUrl: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Requirement Number</label>
                                <select className="form-input" value={formData.requirementNumber} onChange={e => setFormData({ ...formData, requirementNumber: e.target.value })} required>
                                    <option value="">Select requirement...</option>
                                    {myUseCase.requirements.map((req, idx) => (
                                        <option key={idx} value={idx + 1}>R{idx + 1} — {req}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Evaluation Phase</label>
                                <select className="form-input" value={formData.phase} onChange={e => setFormData({ ...formData, phase: e.target.value })}>
                                    <option value="Phase 1">Phase 1 — Initial Progress</option>
                                    <option value="Phase 2">Phase 2 — Core Implementation</option>
                                    <option value="Phase 3">Phase 3 — Final Polish</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description (Optional)</label>
                                <input className="form-input" placeholder="Brief description..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ marginTop: 'var(--space-xl)' }}>
                            <button type="submit" className="btn btn-primary">🚀 Submit for Evaluation</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: 'var(--space-2xl)' }}>
                    <div className="empty-state"><div className="empty-icon">🎯</div><h3>No Use Case Assigned Yet</h3><p>Wait for admin to assign you a use case.</p></div>
                </div>
            )}

            <div className="glass-card section-card" style={{ marginTop: 'var(--space-xl)' }}>
                <h3>📋 My Submission History ({mySubmissions.length})</h3>
                {mySubmissions.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">📤</div><h3>No Submissions Yet</h3><p>Submit your GitHub URL above</p></div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr><th>#</th><th>Phase</th><th>Req</th><th>GitHub URL</th><th>Submitted</th><th>AI Score</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {mySubmissions.map((sub, idx) => {
                                    const evalResult = evaluationResults[sub.id];
                                    return (
                                        <tr key={sub.id}>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{idx + 1}</td>
                                            <td><span className="badge badge-info">{sub.phase}</span></td>
                                            <td>
                                                <span className="badge badge-primary">R{sub.requirement_number}</span>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{myUseCase?.requirements[sub.requirement_number - 1]}</div>
                                            </td>
                                            <td><a href={sub.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', wordBreak: 'break-all' }}>{sub.github_url.replace('https://github.com/', '')}</a></td>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(sub.timestamp).toLocaleString()}</td>
                                            <td>
                                                {evalResult ? (
                                                    <div className={`mark-circle ${evalResult.total_score >= 80 ? 'high' : evalResult.total_score >= 50 ? 'medium' : 'low'}`}>{evalResult.total_score}</div>
                                                ) : <span className="badge badge-warning">Pending</span>}
                                            </td>
                                            <td>{evalResult ? <span className="badge badge-success">✅ Evaluated</span> : <span className="badge badge-warning">⏳ Queued</span>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
