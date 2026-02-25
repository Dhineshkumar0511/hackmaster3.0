import React from 'react';
import { useAppContext } from '../../App';

export default function AdminHome() {
    const { teams, submissions, mentorMarks, evaluationResults, hackathonInfo, batches, selectedBatch, setSelectedBatch } = useAppContext();

    const totalSubmissions = submissions.length;
    const evaluatedCount = Object.keys(evaluationResults).length;
    const teamsWithAssignment = teams.filter(t => t.use_case_id).length;
    const teamsWithMembers = teams.filter(t => t.members?.length > 0).length;
    const markedTeams = Object.keys(mentorMarks).length;

    const teamSubmissionCounts = teams.map(t => ({
        name: `T${t.team_number}`,
        count: submissions.filter(s => s.team_id === t.id || s.team_number === t.team_number).length,
    })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

    const maxCount = Math.max(...teamSubmissionCounts.map(t => t.count), 1);

    const phaseBreakdown = ['Phase 1', 'Phase 2', 'Phase 3'].map(phase => ({
        phase,
        count: submissions.filter(s => s.phase === phase).length,
    }));

    const currentBatchInfo = batches.find(b => b.id === selectedBatch);

    return (
        <div>
            <div className="hero-banner" style={{ marginBottom: 'var(--space-2xl)' }}>
                <h1><span className="gradient-text">ADMIN</span> DASHBOARD</h1>
                <p className="hero-subtitle">HackMaster 3.0 — {hackathonInfo.college} • {hackathonInfo.department}</p>
                <div className="hero-info">
                    <div className="hero-info-item">📅 <strong>{hackathonInfo.hackathonDate}</strong></div>
                    <div className="hero-info-item">🏥 <strong>{hackathonInfo.domain}</strong></div>
                </div>
            </div>

            {/* Batch Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-xl)' }}>
                {batches.map(b => (
                    <button key={b.id} onClick={() => setSelectedBatch(b.id)} style={{
                        padding: '10px 24px', borderRadius: '10px',
                        border: selectedBatch === b.id ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                        background: selectedBatch === b.id ? 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' : 'rgba(255,255,255,0.05)',
                        color: selectedBatch === b.id ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.3s ease',
                    }}>🎓 {b.label}</button>
                ))}
            </div>

            <div className="stats-grid">
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(108, 99, 255, 0.15)' }}>👥</div><div className="stat-value gradient-text">{hackathonInfo.totalTeams}</div><div className="stat-label">Total Teams</div></div>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(0, 212, 255, 0.15)' }}>🎯</div><div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{teamsWithAssignment}</div><div className="stat-label">Teams Assigned</div></div>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(0, 245, 160, 0.15)' }}>📤</div><div className="stat-value" style={{ color: 'var(--accent-green)' }}>{totalSubmissions}</div><div className="stat-label">Total Submissions</div></div>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(255, 140, 0, 0.15)' }}>🤖</div><div className="stat-value" style={{ color: 'var(--accent-orange)' }}>{evaluatedCount}</div><div className="stat-label">AI Evaluated</div></div>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(255, 0, 110, 0.15)' }}>✍️</div><div className="stat-value" style={{ color: 'var(--accent-magenta)' }}>{markedTeams}</div><div className="stat-label">Mentor Marked</div></div>
                <div className="glass-card stat-card"><div className="stat-icon" style={{ background: 'rgba(255, 215, 0, 0.15)' }}>📝</div><div className="stat-value" style={{ color: 'var(--accent-yellow)' }}>{teamsWithMembers}</div><div className="stat-label">Teams Registered</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
                <div className="glass-card dashboard-chart">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>📊 Submissions per Team</h3>
                    {teamSubmissionCounts.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-xl)' }}><p>No submissions yet</p></div>
                    ) : (
                        <div className="bar-chart" style={{ paddingBottom: '30px' }}>
                            {teamSubmissionCounts.slice(0, 15).map((t, idx) => (
                                <div key={idx} className="bar" style={{ height: `${(t.count / maxCount) * 100}%` }}>
                                    <span className="bar-value">{t.count}</span>
                                    <span className="bar-label">{t.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass-card section-card">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>📋 Phase Breakdown</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {phaseBreakdown.map((p, idx) => (
                            <div key={idx} style={{ padding: 'var(--space-md)', background: 'rgba(108, 99, 255, 0.05)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.phase}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>{p.count}</span>
                                </div>
                                <div className="progress-bar"><div className="progress-fill" style={{ width: `${totalSubmissions ? (p.count / totalSubmissions) * 100 : 0}%` }} /></div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-lg)', background: 'rgba(0, 245, 160, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 245, 160, 0.15)' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', marginBottom: '8px', color: 'var(--accent-green)' }}>📊 Quick Stats</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            <div>Evaluation Rate: <strong style={{ color: 'var(--text-primary)' }}>{totalSubmissions ? Math.round((evaluatedCount / totalSubmissions) * 100) : 0}%</strong></div>
                            <div>Assignment Rate: <strong style={{ color: 'var(--text-primary)' }}>{Math.round((teamsWithAssignment / teams.length) * 100)}%</strong></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card section-card">
                <h3>🕐 Recent Submissions</h3>
                {submissions.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-lg)' }}><p>No submissions yet</p></div>
                ) : (
                    <div className="table-container" style={{ border: 'none' }}>
                        <table className="data-table">
                            <thead><tr><th>Team</th><th>Phase</th><th>Req</th><th>GitHub</th><th>Time</th><th>Status</th></tr></thead>
                            <tbody>
                                {submissions.slice(0, 10).map(sub => (
                                    <tr key={sub.id}>
                                        <td style={{ fontWeight: 600 }}>{sub.team_name || `Team ${sub.team_number}`}</td>
                                        <td><span className="badge badge-info">{sub.phase}</span></td>
                                        <td><span className="badge badge-primary">R{sub.requirement_number}</span></td>
                                        <td><a href={sub.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>{sub.github_url.replace('https://github.com/', '').substring(0, 30)}</a></td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(sub.timestamp).toLocaleTimeString()}</td>
                                        <td>{evaluationResults[sub.id] ? <span className="badge badge-success">✅</span> : <span className="badge badge-warning">⏳</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
