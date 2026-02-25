import React from 'react';
import { useAppContext } from '../../App';

export default function TeamUseCases() {
    const { user, teams, useCases, unlockedRequirements } = useAppContext();
    const myTeam = teams.find(t => t.team_number === user?.teamNumber);
    const myUseCaseId = myTeam?.use_case_id;

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">💡 Use Cases</h2>
                <p>{myUseCaseId ? `Your team is assigned Use Case #${myUseCaseId}. Other use cases are locked.` : 'Waiting for admin to assign your use case.'}</p>
            </div>

            {myUseCaseId && (() => {
                const uc = useCases.find(u => u.id === myUseCaseId);
                const visibleReqs = uc.requirements.slice(0, unlockedRequirements);
                const lockedReqsCount = uc.requirements.length - unlockedRequirements;
                return (
                    <div className="glass-card" style={{ padding: 'var(--space-2xl)', marginBottom: 'var(--space-2xl)', border: '1px solid rgba(0, 212, 255, 0.3)', background: 'rgba(0, 212, 255, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                            <span className="badge badge-success">✅ YOUR ASSIGNED USE CASE</span>
                            <span className="badge badge-info">UC #{uc.id}</span>
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 'var(--space-md)' }}>{uc.title}</h3>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                            <span className="chip">{uc.difficulty}</span>
                            <span className="chip">{uc.tech}</span>
                        </div>

                        {/* Objective */}
                        <div style={{ marginBottom: 'var(--space-xl)' }}>
                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)', color: 'var(--accent-green)' }}>🎯 Objective</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{uc.objective}</p>
                        </div>

                        {/* Domain Challenge */}
                        {uc.domainChallenge && (
                            <div style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)', background: 'rgba(108, 99, 255, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(108, 99, 255, 0.2)' }}>
                                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)', color: 'var(--accent-magenta)' }}>🌐 Domain Challenge</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{uc.domainChallenge}</p>
                            </div>
                        )}

                        {/* Requirements — only unlocked ones */}
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: 'var(--space-md)', color: 'var(--accent-cyan)' }}>
                            📌 Requirements ({unlockedRequirements}/{uc.requirements.length} Unlocked)
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {visibleReqs.map((req, idx) => (
                                <div key={idx} className="req-item" style={{ animation: idx >= 5 ? 'fadeIn 0.5s ease-out' : undefined }}>
                                    <span className="req-num">R{idx + 1}</span>
                                    <span className="req-text">{req}</span>
                                    {idx >= 5 && (
                                        <span className="badge badge-warning" style={{ fontSize: '0.6rem', marginLeft: 'auto', padding: '2px 6px' }}>🆕 NEW</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Locked requirements indicator */}
                        {lockedReqsCount > 0 && (
                            <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md) var(--space-lg)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                                    {Array.from({ length: lockedReqsCount }).map((_, i) => (
                                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            🔒
                                        </span>
                                    ))}
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {lockedReqsCount} more requirement{lockedReqsCount > 1 ? 's' : ''} will be released by admin during the hackathon
                                </p>
                            </div>
                        )}
                    </div>
                );
            })()}

            <div className="content-grid">
                {useCases.map(uc => {
                    const isAllocated = uc.id === myUseCaseId;
                    const isLocked = myUseCaseId && !isAllocated;
                    const visibleReqs = uc.requirements.slice(0, unlockedRequirements);
                    return (
                        <div key={uc.id} className={`glass-card usecase-card ${isLocked ? 'locked' : ''}`}>
                            <div className="usecase-number">{String(uc.id).padStart(2, '0')}</div>
                            <div className="usecase-title">{uc.title}</div>
                            <div className="usecase-difficulty"><span className="badge badge-warning">{uc.difficulty}</span></div>
                            <div className="usecase-tech">🔧 {uc.tech}</div>
                            <div className="usecase-desc">{uc.objective}</div>

                            {/* Domain Challenge in card */}
                            {uc.domainChallenge && !isLocked && (
                                <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', background: 'rgba(108, 99, 255, 0.06)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-magenta)' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-magenta)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>🌐 Domain Challenge</span>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{uc.domainChallenge}</p>
                                </div>
                            )}

                            {/* Requirements preview — only unlocked */}
                            {!isLocked && (
                                <div style={{ marginTop: 'var(--space-sm)' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.05em' }}>📌 {unlockedRequirements}/{uc.requirements.length} UNLOCKED</span>
                                    <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {visibleReqs.map((req, idx) => (
                                            <span key={idx} style={{ fontSize: '0.65rem', padding: '2px 6px', background: idx >= 5 ? 'rgba(255, 165, 0, 0.15)' : 'rgba(0, 212, 255, 0.08)', borderRadius: '4px', color: idx >= 5 ? 'var(--accent-orange)' : 'var(--text-muted)' }}>R{idx + 1}</span>
                                        ))}
                                        {uc.requirements.length > unlockedRequirements && (
                                            <span style={{ fontSize: '0.65rem', padding: '2px 6px', color: 'var(--text-muted)' }}>🔒 +{uc.requirements.length - unlockedRequirements}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isAllocated && <div className="allocated-badge">✅ Allocated to your team</div>}
                            {isLocked && <div style={{ marginTop: 'var(--space-md)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔒 Locked</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
