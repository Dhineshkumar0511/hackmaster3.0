import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Trophy, Zap, Shield, Activity, Crown, Star, Clock } from 'lucide-react';
import PrizeCeremony from '../../components/PrizeCeremony';

export default function TeamLeaderboard() {
    const { getLeaderboardData, user } = useAppContext();
    const [showCeremony, setShowCeremony] = useState(false);
    const [nextCeremony, setNextCeremony] = useState('');
    const leaderboard = getLeaderboardData() || [];

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const hours = now.getHours();
            const targetHour = hours % 2 === 0 ? hours + 2 : hours + 1;

            const target = new Date();
            target.setHours(targetHour, 0, 0, 0);

            const diff = target - now;
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setNextCeremony(`${m}:${s.toString().padStart(2, '0')}`);

            if (now.getMinutes() === 0 && now.getSeconds() < 2) {
                setShowCeremony(true);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const customStyles = `
        @keyframes subtle-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes glow-pulse {
            0%, 100% { filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.2)); }
            50% { filter: drop-shadow(0 0 25px rgba(0, 212, 255, 0.4)); }
        }
        
        .podium-container {
            display: flex;
            justify-content: center;
            align-items: flex-end;
            gap: 1.5rem;
            margin: 4rem 0 6rem 0;
            perspective: 1000px;
        }
        .top-team-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 2rem;
            text-align: center;
            position: relative;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: subtle-float 4s ease-in-out infinite;
        }
        .top-team-card:hover {
            transform: translateY(-5px) scale(1.02);
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.2);
        }
        .rank-1 { width: 320px; z-index: 3; animation-delay: 0s; }
        .rank-2 { width: 280px; z-index: 2; animation-delay: -1s; }
        .rank-3 { width: 280px; z-index: 1; animation-delay: -2s; }
        
        .crown-icon {
            position: absolute;
            top: -45px;
            left: 50%;
            transform: translateX(-50%);
            filter: drop-shadow(0 0 15px currentColor);
        }
        .podium-base {
            position: absolute;
            bottom: -20px;
            left: 0;
            right: 0;
            height: 10px;
            border-radius: 10px;
            opacity: 0.5;
        }
        .glass-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 8px;
        }
        .glass-table tr {
            transition: all 0.3s ease;
        }
        .glass-table td {
            background: rgba(255, 255, 255, 0.02);
            padding: 1.25rem 1.5rem;
            backdrop-filter: blur(4px);
        }
        .glass-table tr:hover td {
            background: rgba(255, 255, 255, 0.05);
        }
        .glass-table td:first-child { border-radius: 16px 0 0 16px; border-left: 1px solid rgba(255,255,255,0.05); }
        .glass-table td:last-child { border-radius: 0 16px 16px 0; border-right: 1px solid rgba(255,255,255,0.05); }
    `;

    function TopTeamCard({ team, rank, color, icon: Icon }) {
        if (!team) return null;
        const isUserTeam = team.id === user?.teamId;

        return (
            <div className={`top-team-card rank-${rank} ${isUserTeam ? 'slayer-glow' : ''}`} style={{
                borderTop: `4px solid ${color}`,
                background: 'rgba(255, 255, 255, 0.03)',
                boxShadow: isUserTeam ? `0 0 30px ${color}20 inset, 0 20px 40px rgba(0,0,0,0.4)` : '0 20px 40px rgba(0,0,0,0.4)'
            }}>
                <Icon size={rank === 1 ? 52 : 40} color={color} className="crown-icon" />

                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Rank #{rank}
                    </div>
                    <h3 style={{ fontSize: rank === 1 ? '1.8rem' : '1.4rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                        {team.name}
                    </h3>
                    {isUserTeam && <div style={{ fontSize: '0.7rem', color, fontWeight: 700, marginTop: '4px' }}>✨ YOUR TEAM</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>AI Sync</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00FAFF' }}>{team.aiScore}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Power</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>{team.totalScore}</div>
                    </div>
                </div>

                <div className="podium-base" style={{ background: color }}></div>
            </div>
        );
    }

    if (!leaderboard || leaderboard.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: 'var(--text-muted)' }}>
                <Activity size={48} style={{ marginBottom: '20px', opacity: 0.3, animation: 'pulse 2s infinite' }} />
                <h3 style={{ fontWeight: 800, fontSize: '1.5rem' }}>Awaiting Battle Intelligence...</h3>
                <p style={{ maxWidth: '400px', textAlign: 'center', marginTop: '10px' }}>Rankings will initialize once the verification protocols are active.</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '6rem', position: 'relative' }}>
            <style dangerouslySetInnerHTML={{ __html: customStyles }} />
            {showCeremony && <PrizeCeremony leaderboard={leaderboard} onClose={() => setShowCeremony(false)} />}

            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 20px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '100px', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
                        <div className="pulse" style={{ width: '8px', height: '8px', background: '#00d4ff', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#00d4ff', letterSpacing: '3px', textTransform: 'uppercase' }}>Live Ranking Matrix</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 20px', background: 'rgba(255, 0, 110, 0.05)', borderRadius: '100px', border: '1px solid rgba(255, 0, 110, 0.1)' }}>
                        <Clock size={14} color="#FF006E" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FF006E', letterSpacing: '1px' }}>Ceremony in {nextCeremony}</span>
                    </div>
                </div>
                <h1 style={{ fontSize: '4.5rem', fontWeight: 950, letterSpacing: '-0.05em', lineHeight: 1, margin: 0 }}>
                    <span className="gradient-text">Top Performers</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '1rem', fontWeight: 400 }}>Real-time synchronization with AI-Audit & Mentor Nodes</p>
            </div>

            <div className="podium-container">
                <TopTeamCard team={leaderboard[1]} rank={2} color="#94a3b8" icon={Star} />
                <TopTeamCard team={leaderboard[0]} rank={1} color="#fbbf24" icon={Crown} />
                <TopTeamCard team={leaderboard[2]} rank={3} color="#d97706" icon={Trophy} />
            </div>

            <div className="glass-card" style={{ padding: '0', background: 'transparent', border: 'none' }}>
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Rank</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Team</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Sync</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Power</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.slice(3).map((team, idx) => (
                            <tr key={team.id} style={{ opacity: 0.9 }}>
                                <td style={{ width: '80px' }}>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem' }}>#{idx + 4}</div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: team.id === user?.teamId ? 'var(--accent-cyan)' : '#fff' }}>
                                        {team.name}
                                        {team.id === user?.teamId && <span style={{ fontSize: '0.65rem', marginLeft: '10px', verticalAlign: 'middle', background: 'rgba(0, 212, 255, 0.1)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '4px' }}>YOU</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{team.useCaseTitle}</div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#00FAFF', fontWeight: 900 }}>
                                        <Shield size={14} /> {team.aiScore}%
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#fff', fontFamily: 'var(--font-mono)' }}>{team.totalScore}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
