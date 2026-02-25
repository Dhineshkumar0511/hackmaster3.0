import React, { useState } from 'react';
import { useAppContext } from '../../App';

export default function AdminTeamDetails() {
    const { teams, allUseCases, batches, selectedBatch, setSelectedBatch } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTeam, setExpandedTeam] = useState(null);

    const allUCs = [...(allUseCases['2027'] || []), ...(allUseCases['2028'] || [])];

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.team_number).includes(searchTerm)
    );

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">👥 Team Details</h2>
                <p>View all team registrations, members, and mentor details</p>
            </div>

            {/* Batch Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)' }}>
                {batches.map(b => (
                    <button key={b.id} onClick={() => setSelectedBatch(b.id)} style={{
                        padding: '8px 20px', borderRadius: '8px',
                        border: selectedBatch === b.id ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                        background: selectedBatch === b.id ? 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' : 'rgba(255,255,255,0.05)',
                        color: selectedBatch === b.id ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                    }}>{b.label}</button>
                ))}
            </div>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <input className="form-input" placeholder="🔍 Search by team name or number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: '400px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {filteredTeams.map(team => {
                    const uc = team.use_case_id ? allUCs.find(u => u.id === team.use_case_id) : null;
                    const isExpanded = expandedTeam === team.id;

                    return (
                        <div key={team.id} className="glass-card" style={{ padding: 'var(--space-xl)', cursor: 'pointer' }} onClick={() => setExpandedTeam(isExpanded ? null : team.id)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>{team.team_number}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{team.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{team.members?.length || 0} members{uc && <span> • <span style={{ color: 'var(--accent-cyan)' }}>UC #{uc.id}</span></span>}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                    {team.members?.length > 0 ? <span className="badge badge-success">✅ Registered</span> : <span className="badge badge-warning">⏳ Pending</span>}
                                    <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', fontSize: '1.2rem' }}>▼</span>
                                </div>
                            </div>

                            {isExpanded && (
                                <div style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-xl)' }}>
                                    {uc && (
                                        <div style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', background: 'rgba(0, 212, 255, 0.05)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>Assigned Use Case</div>
                                            <div style={{ fontWeight: 600 }}>#{uc.id} — {uc.title}</div>
                                        </div>
                                    )}

                                    {team.members?.length > 0 ? (
                                        <>
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>👥 Team Members</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                                {team.members.map((member, idx) => (
                                                    <div key={idx} style={{ padding: 'var(--space-md)', background: 'rgba(108, 99, 255, 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{member.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.regNo} • {member.role}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email} • {member.phone}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: 'var(--space-md)' }}>No members registered yet</div>
                                    )}

                                    {team.mentor?.name && (
                                        <>
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>🎓 Mentor</h4>
                                            <div style={{ padding: 'var(--space-md)', background: 'rgba(0, 245, 160, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 245, 160, 0.15)', maxWidth: '300px' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{team.mentor.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.mentor.department}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.mentor.email} • {team.mentor.phone}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
