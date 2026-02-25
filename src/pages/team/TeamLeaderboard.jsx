import React from 'react';
import { useAppContext } from '../../App';

export default function TeamLeaderboard() {
    const { getLeaderboardData, user } = useAppContext();
    const leaderboard = getLeaderboardData();

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">🏆 Leaderboard</h2>
                <p>Live rankings based on AI evaluation + mentor marks across all teams</p>
            </div>

            {/* Top 3 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
                {leaderboard.slice(0, 3).map((team, idx) => (
                    <div key={team.id} className="glass-card" style={{
                        padding: 'var(--space-xl)',
                        textAlign: 'center',
                        border: `1px solid ${idx === 0 ? 'rgba(255, 215, 0, 0.4)' : idx === 1 ? 'rgba(192, 192, 192, 0.3)' : 'rgba(205, 127, 50, 0.3)'}`,
                        background: idx === 0
                            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 140, 0, 0.03))'
                            : idx === 1
                                ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.05), rgba(160, 160, 160, 0.02))'
                                : 'linear-gradient(135deg, rgba(205, 127, 50, 0.05), rgba(139, 69, 19, 0.02))',
                        transform: idx === 0 ? 'scale(1.05)' : 'none',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </div>
                        <div className={`rank-badge ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : 'bronze'}`} style={{ margin: '0 auto 12px' }}>
                            #{idx + 1}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                            {team.name}
                            {team.id === user?.teamId && <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', display: 'block' }}>← Your Team</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                            Team #{team.teamNumber}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900 }}>
                            <span className="gradient-text">{team.totalScore}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Score</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', marginTop: '12px' }}>
                            <span className="chip">AI: {team.aiScore}</span>
                            <span className="chip">Mentor: {team.mentorScore}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Full Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Team</th>
                            <th>Use Case</th>
                            <th>Submissions</th>
                            <th>AI Score</th>
                            <th>Mentor Score</th>
                            <th>Total Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((team, idx) => (
                            <tr key={team.id} style={{
                                background: team.id === user?.teamId ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                            }}>
                                <td>
                                    <div className={`rank-badge ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}
                                        style={{ background: idx >= 3 ? 'rgba(108, 99, 255, 0.1)' : undefined }}>
                                        {idx + 1}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>
                                        {team.name}
                                        {team.id === user?.teamId && <span className="badge badge-info" style={{ marginLeft: '8px', fontSize: '0.65rem' }}>YOU</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team #{team.teamNumber}</div>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                    {team.useCaseTitle}
                                </td>
                                <td>
                                    <span className="badge badge-primary">{team.submissionCount}</span>
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                                    {team.aiScore}
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)' }}>
                                    {team.mentorScore}
                                </td>
                                <td>
                                    <span style={{
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 800,
                                        fontSize: '1.1rem',
                                        color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'var(--text-primary)',
                                    }}>
                                        {team.totalScore}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
