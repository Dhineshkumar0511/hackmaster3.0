import React, { useState } from 'react';
import { useAppContext } from '../../App';

export default function TeamSubmission() {
    const { user, teams, submissions, addSubmission, evaluationResults, getUseCasesByBatch, unlockedRequirements } = useAppContext();
    const myBatchUseCases = getUseCasesByBatch(user?.batch || '2027');
    const myTeam = teams.find(t => t.team_number === user?.teamNumber);
    const myUseCase = myTeam?.use_case_id ? myBatchUseCases.find(u => u.id === myTeam.use_case_id) : null;
    const mySubmissions = submissions.filter(s => s.team_number === user?.teamNumber);

    const [formData, setFormData] = useState({ githubUrl: '', requirementNumbers: [], description: '', phase: 'Phase 1' });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.githubUrl || formData.requirementNumbers.length === 0) return;

        setSubmitting(true);
        // Multi-submission support
        for (const reqNum of formData.requirementNumbers) {
            await addSubmission({
                githubUrl: formData.githubUrl,
                requirementNumber: reqNum,
                description: formData.description,
                phase: formData.phase,
                useCaseId: myTeam?.use_case_id,
            });
        }
        setFormData({ githubUrl: '', requirementNumbers: [], description: '', phase: formData.phase });
        setSubmitting(false);
    };

    const toggleRequirement = (num) => {
        setFormData(prev => {
            const current = prev.requirementNumbers;
            const updated = current.includes(num)
                ? current.filter(n => n !== num)
                : [...current, num];
            return { ...prev, requirementNumbers: updated };
        });
    };

    const handleSelectAll = () => {
        const allUnlocked = Array.from({ length: Math.min(unlockedRequirements, myUseCase.requirements.length) }, (_, i) => i + 1);
        setFormData(prev => ({
            ...prev,
            requirementNumbers: prev.requirementNumbers.length === allUnlocked.length ? [] : allUnlocked
        }));
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">📤 My Submissions</h2>
                <p>Submit your GitHub URL for evaluation per requirement</p>
            </div>

            {myUseCase ? (
                <div className="glass-card submission-form-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                        <h3 style={{ margin: 0 }}>🆕 New Submission</h3>
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                            {formData.requirementNumbers.length} Requirements Selected
                        </span>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="submission-grid">
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">GitHub Repository URL</label>
                                <input className="form-input" type="url" placeholder="https://github.com/your-team/project" value={formData.githubUrl} onChange={e => setFormData({ ...formData, githubUrl: e.target.value })} required />
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>Select Requirements (Released: {unlockedRequirements})</label>
                                    <button type="button" onClick={handleSelectAll} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                        {formData.requirementNumbers.length === Math.min(unlockedRequirements, myUseCase.requirements.length) ? 'Unselect All' : 'Select All Unlocked'}
                                    </button>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                    gap: '8px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    padding: 'var(--space-md)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    maxHeight: '250px',
                                    overflowY: 'auto'
                                }}>
                                    {myUseCase.requirements.slice(0, unlockedRequirements).map((req, idx) => {
                                        const num = idx + 1;
                                        const isChecked = formData.requirementNumbers.includes(num);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => toggleRequirement(num)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '10px 14px',
                                                    background: isChecked ? 'rgba(108, 99, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                                    border: `1px solid ${isChecked ? 'var(--primary)' : 'transparent'}`,
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '4px',
                                                    border: `2px solid ${isChecked ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
                                                    background: isChecked ? 'var(--primary)' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.6rem'
                                                }}>
                                                    {isChecked && '✓'}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', flex: 1 }}>
                                                    <span style={{ fontWeight: 700, color: isChecked ? 'var(--primary-light)' : 'var(--text-muted)', marginRight: '8px' }}>R{num}</span>
                                                    <span style={{ color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{req}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                            <button type="submit" className="btn btn-primary" disabled={submitting || formData.requirementNumbers.length === 0}>
                                {submitting ? '⏳ Submitting...' : `🚀 Submit ${formData.requirementNumbers.length} Requirements for Evaluation`}
                            </button>
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
