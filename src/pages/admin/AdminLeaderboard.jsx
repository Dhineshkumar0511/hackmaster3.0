import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import PrizeCeremony from '../../components/PrizeCeremony';
import { PlayCircle, Clock } from 'lucide-react';

export default function AdminLeaderboard() {
    const { getLeaderboardData, batches, selectedBatch, setSelectedBatch } = useAppContext();
    const [showCeremony, setShowCeremony] = useState(false);
    const leaderboard = getLeaderboardData();

    // Auto-trigger logic (Optional: every 2 hours)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            // Trigger if it's an even hour and very close to the start (e.g., 2:00, 4:00)
            if (now.getHours() % 2 === 0 && now.getMinutes() === 0 && now.getSeconds() < 10) {
                setShowCeremony(true);
            }
        }, 1000 * 10); // Check every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ position: 'relative' }}>
            {showCeremony && <PrizeCeremony leaderboard={leaderboard} onClose={() => setShowCeremony(false)} />}

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 className="gradient-text">🏆 Leaderboard</h2>
                    <p>Live rankings based on AI evaluation scores + mentor marks</p>
                </div>
                <button
                    className="btn"
                    onClick={() => setShowCeremony(true)}
                    style={{ background: 'rgba(108, 99, 255, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary-light)', padding: '10px 20px', fontSize: '0.8rem', fontWeight: 800 }}
                >
                    <PlayCircle size={16} /> TRIGGER PRIZE CEREMONY
                </button>
            </div>

            {/* Batch Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-xl)' }}>
                {batches.map(b => (
                    <button key={b.id} onClick={() => setSelectedBatch(b.id)} style={{
                        padding: '8px 20px', borderRadius: '8px',
                        border: selectedBatch === b.id ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                        background: selectedBatch === b.id ? 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' : 'rgba(255,255,255,0.05)',
                        color: selectedBatch === b.id ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                    }}>🎓 {b.label}</button>
                ))}
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
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span className="chip" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>AI: {leaderboard[1].aiScore}%</span>
                            <span className="chip" style={{ background: 'rgba(108, 99, 255, 0.1)', color: 'var(--primary-light)' }}>Phase: {leaderboard[1].normPhase}%</span>
                            <span className="chip" style={{ background: 'rgba(255, 61, 113, 0.1)', color: 'var(--accent-magenta)' }}>Req: {leaderboard[1].reqScore}%</span>
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
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: '12px', flexWrap: 'wrap' }}>
                            <span className="chip" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>AI: {leaderboard[0].aiScore}%</span>
                            <span className="chip" style={{ background: 'rgba(108, 99, 255, 0.1)', color: 'var(--primary-light)' }}>Phase: {leaderboard[0].normPhase}%</span>
                            <span className="chip" style={{ background: 'rgba(255, 61, 113, 0.1)', color: 'var(--accent-magenta)' }}>Req: {leaderboard[0].reqScore}%</span>
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
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span className="chip" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>AI: {leaderboard[2].aiScore}%</span>
                            <span className="chip" style={{ background: 'rgba(108, 99, 255, 0.1)', color: 'var(--primary-light)' }}>Phase: {leaderboard[2].normPhase}%</span>
                            <span className="chip" style={{ background: 'rgba(255, 61, 113, 0.1)', color: 'var(--accent-magenta)' }}>Req: {leaderboard[2].reqScore}%</span>
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
                            <th>AI Score</th>
                            <th>Phase (100)</th>
                            <th>Req (100)</th>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ fontWeight: 600 }}>{team.name}</div>
                                        {team.plagiarismRisk !== 'Low' && (
                                            <span className="chip" style={{ background: 'rgba(255, 61, 113, 0.1)', color: 'var(--accent-magenta)', fontSize: '0.6rem', padding: '2px 6px' }}>
                                                ⚠️ PLAGIARISM: {team.plagiarismRisk}
                                            </span>
                                        )}
                                        {!team.identityVerified && (
                                            <span className="chip" style={{ background: 'rgba(255, 152, 0, 0.1)', color: '#FF9800', fontSize: '0.6rem', padding: '2px 6px' }}>
                                                🆔 IDENTITY MISMATCH
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Team #{team.teamNumber}</div>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                    {team.useCaseTitle}
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>{team.aiScore}%</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-light)' }}>{team.normPhase}%</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-magenta)' }}>{team.reqScore}%</td>
                                <td>
                                    <span style={{
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 800,
                                        fontSize: '1.2rem',
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
