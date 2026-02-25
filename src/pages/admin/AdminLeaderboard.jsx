import React from 'react';
import { useAppContext } from '../../App';

export default function AdminLeaderboard() {
    const { getLeaderboardData } = useAppContext();
    const leaderboard = getLeaderboardData();

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">🏆 Leaderboard</h2>
                <p>Live rankings based on AI evaluation scores + mentor marks</p>
            </div>

            {/* Top 3 Podium */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)', alignItems: 'flex-end' }}>
                {/* 2nd Place */}
                {leaderboard[1] && (
                    <div className="glass-card" style={{
                        padding: 'var(--space-xl)',
                        textAlign: 'center',
                        border: '1px solid rgba(192, 192, 192, 0.3)',
                        background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.05), rgba(160, 160, 160, 0.02))',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🥈</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '4px' }}>{leaderboard[1].name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Team #{leaderboard[1].teamNumber}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, color: '#C0C0C0' }}>{leaderboard[1].totalScore}</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: '8px' }}>
                            <span className="chip">AI: {leaderboard[1].aiScore}</span>
                            <span className="chip">Mentor: {leaderboard[1].mentorScore}</span>
                        </div>
                    </div>
                )}

                {/* 1st Place */}
                {leaderboard[0] && (
                    <div className="glass-card" style={{
                        padding: 'var(--space-2xl)',
                        textAlign: 'center',
                        border: '1px solid rgba(255, 215, 0, 0.4)',
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 140, 0, 0.03))',
                        transform: 'scale(1.05)',
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏆</div>
                        <div className="rank-badge gold" style={{ margin: '0 auto 12px', width: '40px', height: '40px', fontSize: '1rem' }}>#1</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px' }}>{leaderboard[0].name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Team #{leaderboard[0].teamNumber}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900 }}>
                            <span className="gradient-text">{leaderboard[0].totalScore}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: '12px' }}>
                            <span className="chip">AI: {leaderboard[0].aiScore}</span>
                            <span className="chip">Mentor: {leaderboard[0].mentorScore}</span>
                            <span className="chip">Subs: {leaderboard[0].submissionCount}</span>
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {leaderboard[2] && (
                    <div className="glass-card" style={{
                        padding: 'var(--space-xl)',
                        textAlign: 'center',
                        border: '1px solid rgba(205, 127, 50, 0.3)',
                        background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.05), rgba(139, 69, 19, 0.02))',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🥉</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '4px' }}>{leaderboard[2].name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Team #{leaderboard[2].teamNumber}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, color: '#CD7F32' }}>{leaderboard[2].totalScore}</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: '8px' }}>
                            <span className="chip">AI: {leaderboard[2].aiScore}</span>
                            <span className="chip">Mentor: {leaderboard[2].mentorScore}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Full Leaderboard Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Team</th>
                            <th>Use Case</th>
                            <th>Submissions</th>
                            <th>Req. Met</th>
                            <th>AI Score</th>
                            <th>Mentor Score</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((team, idx) => (
                            <tr key={team.id}>
                                <td>
                                    <div className={`rank-badge ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}
                                        style={{ background: idx >= 3 ? 'rgba(108, 99, 255, 0.1)' : undefined }}>
                                        {idx + 1}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{team.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Team #{team.teamNumber}</div>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                    {team.useCaseTitle}
                                </td>
                                <td><span className="badge badge-primary">{team.submissionCount}</span></td>
                                <td>
                                    {team.totalReqs > 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div className="progress-bar" style={{ width: '60px' }}>
                                                <div className="progress-fill" style={{ width: `${(team.reqSatisfied / team.totalReqs) * 100}%` }} />
                                            </div>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{team.reqSatisfied}/{team.totalReqs}</span>
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                    )}
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>{team.aiScore}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)' }}>{team.mentorScore}</td>
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
