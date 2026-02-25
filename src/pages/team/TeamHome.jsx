import React from 'react';
import { useAppContext } from '../../App';
import { HACKATHON_INFO, EVALUATION_PHASES, TIMELINE } from '../../data/constants';

export default function TeamHome() {
    const { user, teams, submissions, useCases } = useAppContext();
    const myTeam = teams.find(t => t.team_number === user?.teamNumber);
    const myUseCase = myTeam?.use_case_id ? useCases.find(u => u.id === myTeam.use_case_id) : null;
    const mySubmissions = submissions.filter(s => s.team_number === user?.teamNumber);
    const currentPhase = TIMELINE.find(t => t.status === 'active');
    const upcomingEvents = TIMELINE.filter(t => t.status === 'upcoming').slice(0, 3);

    return (
        <div>
            {/* Hero Banner */}
            <div className="hero-banner">
                <h1>
                    <span className="gradient-text">HACKMASTER</span> 3.0
                </h1>
                <p className="hero-subtitle">
                    🏥 {HACKATHON_INFO.domain} — {HACKATHON_INFO.focus}
                </p>
                <div className="hero-info">
                    <div className="hero-info-item">📅 <strong>{HACKATHON_INFO.hackathonDate}</strong></div>
                    <div className="hero-info-item">👥 <strong>{HACKATHON_INFO.totalTeams} Teams</strong></div>
                    <div className="hero-info-item">🏢 <strong>{HACKATHON_INFO.college}</strong></div>
                </div>
                <div className="club-logos" style={{ justifyContent: 'flex-start', paddingTop: '16px' }}>
                    <div className="club-logo">
                        <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4FF)', color: 'white', fontSize: '0.7rem' }}>IA</div>
                        <span className="logo-name">InfitiAid Club</span>
                    </div>
                    <div className="club-logo">
                        <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #FF006E, #FF8C00)', color: 'white', fontSize: '0.7rem' }}>ID</div>
                        <span className="logo-name">IDSC</span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(108, 99, 255, 0.15)' }}>👥</div>
                    <div className="stat-value gradient-text">{user?.teamName || 'Team'}</div>
                    <div className="stat-label">Team #{user?.teamNumber} • Leader Portal</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(0, 212, 255, 0.15)' }}>💡</div>
                    <div className="stat-value" style={{ fontSize: '1.2rem', color: myUseCase ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                        {myUseCase ? `UC #${myUseCase.id}` : 'Not Assigned'}
                    </div>
                    <div className="stat-label">{myUseCase ? myUseCase.title : 'Awaiting use case assignment'}</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(0, 245, 160, 0.15)' }}>📤</div>
                    <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{mySubmissions.length}</div>
                    <div className="stat-label">Total Submissions</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(255, 140, 0, 0.15)' }}>🎯</div>
                    <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>{myUseCase?.requirements?.length || 0}</div>
                    <div className="stat-label">Requirements to Fulfill</div>
                </div>
            </div>

            {/* Current Phase & Upcoming */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
                <div className="glass-card section-card">
                    <h3>🔥 Current Phase</h3>
                    {currentPhase ? (
                        <div style={{ padding: 'var(--space-md)', background: 'rgba(0, 212, 255, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>{currentPhase.date}</div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{currentPhase.title}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{currentPhase.desc}</div>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: 'var(--space-lg)' }}><p>No active phase right now</p></div>
                    )}
                </div>
                <div className="glass-card section-card">
                    <h3>📅 Upcoming Events</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {upcomingEvents.map((event, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 'var(--space-md)', padding: 'var(--space-sm) 0', borderBottom: idx < upcomingEvents.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '80px' }}>{event.date.split('|')[0].trim()}</span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{event.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{event.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Evaluation Phases */}
            <div className="glass-card section-card">
                <h3>📊 Evaluation Phases</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
                    {EVALUATION_PHASES.map((phase, idx) => (
                        <div key={idx} style={{ padding: 'var(--space-lg)', background: 'rgba(108, 99, 255, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-light)', marginBottom: '8px' }}>{phase.phase}</div>
                            <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>{phase.focus}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>🕐 {phase.time}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
