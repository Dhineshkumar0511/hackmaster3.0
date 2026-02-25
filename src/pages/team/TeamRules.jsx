import React from 'react';
import { RULES, EVALUATION_PHASES } from '../../data/constants';

export default function TeamRules() {
    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">📋 Rules & Regulations</h2>
                <p>Official guidelines for HackMaster 3.0 Healthcare Hackathon</p>
            </div>

            {/* General Rules */}
            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3>📌 General Rules</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {RULES.map((rule, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-md)',
                            padding: 'var(--space-md)',
                            background: 'rgba(108, 99, 255, 0.03)',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '3px solid var(--primary)',
                        }}>
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                color: 'var(--primary-light)',
                                minWidth: '28px',
                            }}>
                                {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {rule}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Evaluation Structure */}
            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3>📊 Evaluation Structure</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
                    {EVALUATION_PHASES.map((phase, idx) => (
                        <div key={idx} style={{
                            padding: 'var(--space-xl)',
                            background: 'rgba(108, 99, 255, 0.05)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '10px',
                                right: '15px',
                                fontFamily: 'var(--font-display)',
                                fontSize: '2.5rem',
                                fontWeight: 900,
                                opacity: 0.06,
                            }}>
                                {idx + 1}
                            </div>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                marginBottom: '8px',
                            }}>
                                <span className="gradient-text">{phase.phase}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', marginBottom: '8px', lineHeight: 1.5 }}>
                                {phase.focus}
                            </div>
                            <div className="badge badge-info">🕐 {phase.time}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add-On Feature Rule */}
            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3>⚡ Add-On Feature Rules</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
                    {[
                        { icon: '⏱️', text: 'New add-on feature released every 3 hours' },
                        { icon: '⚠️', text: 'Add-ons are mandatory for all teams' },
                        { icon: '📊', text: 'Marks awarded based on successful implementation' },
                        { icon: '🔄', text: 'Same add-on given to all teams simultaneously' },
                    ].map((item, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-md)',
                            padding: 'var(--space-lg)',
                            background: 'rgba(255, 140, 0, 0.05)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(255, 140, 0, 0.15)',
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                            <span style={{ fontSize: '0.9rem' }}>{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Awards */}
            <div className="glass-card section-card">
                <h3>🏆 Awards Structure</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--space-lg)',
                    textAlign: 'center',
                }}>
                    <div style={{
                        padding: 'var(--space-xl)',
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.05))',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🥇</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#FFD700' }}>First Prize</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Per Problem Statement</div>
                    </div>
                    <div style={{
                        padding: 'var(--space-xl)',
                        background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.1), rgba(160, 160, 160, 0.05))',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(192, 192, 192, 0.3)',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🥈</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#C0C0C0' }}>Second Prize</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Per Problem Statement</div>
                    </div>
                    <div style={{
                        padding: 'var(--space-xl)',
                        background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(0, 212, 255, 0.05))',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-color)',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📊</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--primary-light)' }}>28 Teams</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>14 Shortlisted for Jury</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
