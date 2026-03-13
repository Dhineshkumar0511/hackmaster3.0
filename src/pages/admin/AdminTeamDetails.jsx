import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../App';

export default function AdminTeamDetails() {
    const { teams, useCases, batches, selectedBatch, setSelectedBatch, clearTeamRegistration, showToast } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [confirmClear, setConfirmClear] = useState(null);
    const [batchStats, setBatchStats] = useState({});

    const allUCs = useCases || [];

    const hasTeamRegistration = useCallback(
        (team) => Array.isArray(team.members) && team.members.some(m => m?.name?.trim()),
        []
    );

    const loadBatchStats = useCallback(async () => {
        const token = localStorage.getItem('hackmaster_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        try {
            const responses = await Promise.all(
                batches.map(async (batch) => {
                    const res = await fetch(`/api/teams?batch=${batch.id}`, { headers });
                    if (!res.ok) throw new Error(`Failed to load team stats for batch ${batch.id}`);
                    const batchTeams = await res.json();
                    const registered = batchTeams.filter(hasTeamRegistration).length;
                    const pending = Math.max(batchTeams.length - registered, 0);

                    return [batch.id, { total: batchTeams.length, registered, pending }];
                })
            );

            setBatchStats(Object.fromEntries(responses));
        } catch {
            showToast('Failed to load batch-wise team stats', 'error');
        }
    }, [batches, hasTeamRegistration, showToast]);

    useEffect(() => {
        loadBatchStats();
    }, [loadBatchStats]);

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.team_number).includes(searchTerm)
    );

    const handleClearRegistration = async (teamId) => {
        await clearTeamRegistration(teamId);
        setConfirmClear(null);
        loadBatchStats();
    };

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', letterSpacing: '0.03em' }}>⏳ Pending Teams</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {batches.map((b) => (
                            <div key={`pending-${b.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{b.label}</span>
                                <span style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>{batchStats[b.id]?.pending ?? 0}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', letterSpacing: '0.03em' }}>👥 Total Teams</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {batches.map((b) => (
                            <div key={`total-${b.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{b.label}</span>
                                <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{batchStats[b.id]?.total ?? 0}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', letterSpacing: '0.03em' }}>✅ Registered Teams</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {batches.map((b) => (
                            <div key={`registered-${b.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{b.label}</span>
                                <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{batchStats[b.id]?.registered ?? 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <input className="form-input" placeholder="🔍 Search by team name or number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: '400px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', minHeight: '300px' }}>
                {filteredTeams.length === 0 ? (
                    <div className="glass-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>👥</div>
                        <h3>No Teams Found</h3>
                        <p>No teams are registered for Batch {selectedBatch} yet.</p>
                    </div>
                ) : (
                    filteredTeams.map(team => {
                        const uc = team.use_case_id ? allUCs.find(u => u.id === team.use_case_id) : null;
                        const isExpanded = expandedTeam === team.id;
                        const hasRegistration = hasTeamRegistration(team);

                        return (
                            <div key={team.id} className="glass-card" style={{ padding: 'var(--space-xl)', cursor: 'pointer' }} onClick={() => setExpandedTeam(isExpanded ? null : team.id)}>
                                {/* ... rest of the team card content ... */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>{team.team_number}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{team.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{team.members?.length || 0} members{uc && <span> • <span style={{ color: 'var(--accent-cyan)' }}>UC #{uc.id}</span></span>}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                        {hasRegistration ? <span className="badge badge-success">✅ Registered</span> : <span className="badge badge-warning">⏳ Pending</span>}
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

                                        {hasRegistration ? (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>👥 Team Members</h4>
                                                    {confirmClear === team.id ? (
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>Clear all data?</span>
                                                            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleClearRegistration(team.id); }}
                                                                style={{ background: 'var(--accent-red)', color: '#fff', fontSize: '0.7rem', padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                                                                ✓ Yes, Clear
                                                            </button>
                                                            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setConfirmClear(null); }}
                                                                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={(e) => { e.stopPropagation(); setConfirmClear(team.id); }}
                                                            style={{ background: 'rgba(255, 61, 113, 0.1)', color: 'var(--accent-red)', fontSize: '0.7rem', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255, 61, 113, 0.3)', cursor: 'pointer', fontWeight: 600 }}>
                                                            🗑️ Clear Registration
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                                    {(team.members || []).map((member, idx) => (
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
                    })
                )}
            </div>
        </div>
    );
}
