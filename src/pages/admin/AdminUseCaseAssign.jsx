import React, { useState } from 'react';
import { useAppContext } from '../../App';

export default function AdminUseCaseAssign() {
    const { teams, useCases, assignUseCase, unlockedRequirements, setUnlockedRequirements, batches, selectedBatch, setSelectedBatch } = useAppContext();
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedUseCase, setSelectedUseCase] = useState('');
    const [expandedUC, setExpandedUC] = useState(null);

    const handleAssign = () => {
        if (!selectedTeam || !selectedUseCase) return;
        assignUseCase(parseInt(selectedTeam), parseInt(selectedUseCase));
        setSelectedTeam('');
        setSelectedUseCase('');
    };

    const handleBulkAssign = async () => {
        if (useCases.length === 0) return;
        if (!window.confirm(`Are you sure you want to bulk assign use cases to all ${teams.length} teams?`)) return;

        // Shuffle use cases for randomness
        const shuffledUCs = [...useCases].sort(() => Math.random() - 0.5);

        // Loop through teams and assign sequentially from the shuffled list
        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            const uc = shuffledUCs[i % shuffledUCs.length];
            await assignUseCase(team.id, uc.id);
        }
    };

    const handleBulkUnassign = async () => {
        if (!window.confirm(`Are you sure you want to unassign ALL use cases from ALL ${teams.length} teams? This cannot be undone.`)) return;

        for (const team of teams) {
            if (team.use_case_id) {
                await assignUseCase(team.id, null);
            }
        }
    };

    const handleReleaseNext = () => {
        if (unlockedRequirements < 10) {
            setUnlockedRequirements(unlockedRequirements + 1);
        }
    };

    const handleSetUnlocked = (count) => {
        setUnlockedRequirements(count);
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">🎯 Assign Use Cases & Release Requirements</h2>
                <p>Assign use cases to teams and release requirements progressively</p>
            </div>

            {/* Batch Selector */}
            <div className="glass-card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🎓 Select Batch:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {batches.map(b => (
                        <button
                            key={b.id}
                            onClick={() => setSelectedBatch(b.id)}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '10px',
                                border: selectedBatch === b.id ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                                background: selectedBatch === b.id ? 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' : 'rgba(255,255,255,0.05)',
                                color: selectedBatch === b.id ? '#fff' : 'var(--text-secondary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {b.label} ({b.totalTeams} Teams)
                        </button>
                    ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    Showing {useCases.length} use cases for {selectedBatch === '2027' ? '3rd Year' : '2nd Year'}
                </span>
            </div>

            {/* Requirement Release Control */}
            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-2xl)', border: '1px solid rgba(255, 165, 0, 0.3)', background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.03), rgba(255, 0, 110, 0.03))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                    <div>
                        <h3>🔓 Release Requirements to All Teams</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            First 5 requirements are visible by default. Release additional requirements one by one during the hackathon.
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900 }}>
                            <span className="gradient-text">{unlockedRequirements}</span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/10</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requirements Released</span>
                    </div>
                </div>

                {/* Requirement Progress */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
                    {Array.from({ length: 10 }).map((_, i) => {
                        const reqNum = i + 1;
                        const isUnlocked = reqNum <= unlockedRequirements;
                        const isDefault = reqNum <= 5;
                        return (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '12px',
                                    background: isUnlocked
                                        ? (isDefault ? 'linear-gradient(135deg, #00D4FF, #6C63FF)' : 'linear-gradient(135deg, #FF8C00, #FF006E)')
                                        : 'rgba(255, 255, 255, 0.05)',
                                    border: isUnlocked ? 'none' : '2px dashed rgba(255, 255, 255, 0.15)',
                                    cursor: !isUnlocked ? 'pointer' : 'default',
                                    transition: 'all 0.3s ease',
                                    boxShadow: isUnlocked ? '0 4px 15px rgba(0,0,0,0.3)' : 'none',
                                }}
                                onClick={() => !isUnlocked && handleSetUnlocked(reqNum)}
                                title={isUnlocked ? `R${reqNum} — Unlocked` : `Click to unlock R${reqNum}`}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isUnlocked ? '#fff' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>R{reqNum}</div>
                                    <div style={{ fontSize: '0.6rem', marginTop: '2px' }}>{isUnlocked ? '✅' : '🔒'}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Release Button */}
                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleReleaseNext}
                        disabled={unlockedRequirements >= 10}
                        style={{ background: unlockedRequirements >= 10 ? 'var(--text-muted)' : 'linear-gradient(135deg, #FF8C00, #FF006E)', fontSize: '0.9rem', padding: '10px 24px' }}
                    >
                        {unlockedRequirements >= 10
                            ? '✅ All Requirements Released'
                            : `🚀 Release R${unlockedRequirements + 1} to All Teams`
                        }
                    </button>
                    {unlockedRequirements > 5 && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleSetUnlocked(5)}>
                            ↩️ Reset to 5
                        </button>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {unlockedRequirements <= 5
                            ? 'Default: R1–R5 visible'
                            : `R1–R${unlockedRequirements} visible to all teams`
                        }
                    </span>
                </div>
            </div>

            {/* Assignment Section */}
            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-2xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <h3 style={{ margin: 0 }}>🆕 Assign Use Case to Team</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <button className="btn btn-secondary" onClick={handleBulkAssign} style={{ fontSize: '0.8rem' }}>🎲 Bulk Assign (Random)</button>
                        <button className="btn btn-outline" onClick={handleBulkUnassign} style={{ fontSize: '0.8rem', border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)' }}>🧹 Bulk Unassign All</button>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-lg)', alignItems: 'end' }}>
                    <div className="form-group">
                        <label className="form-label">Select Team</label>
                        <select className="form-input" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                            <option value="">Choose a team...</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>Team {t.team_number} — {t.name} {t.use_case_id ? '(Assigned)' : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Select Use Case</label>
                        <select className="form-input" value={selectedUseCase} onChange={e => setSelectedUseCase(e.target.value)}>
                            <option value="">Choose a use case...</option>
                            {useCases.map((uc, idx) => (
                                <option key={uc.id} value={uc.id}>#{idx + 1} — {uc.title} [{uc.difficulty}]</option>
                            ))}
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={handleAssign} style={{ height: '45px' }}>🎯 Assign</button>
                </div>
            </div>

            {/* Assignment Overview */}
            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-2xl)' }}>
                <h3>📋 Assignment Overview</h3>
                <div className="table-container" style={{ border: 'none', maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--card-bg)' }}>
                                <th>Team #</th><th>Team Name</th><th>Assigned Use Case</th><th>Visible Reqs</th><th>Status</th><th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map(team => {
                                const ucIndex = team.use_case_id ? useCases.findIndex(u => u.id === team.use_case_id) : -1;
                                const uc = ucIndex !== -1 ? useCases[ucIndex] : null;
                                return (
                                    <tr key={team.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{team.team_number}</td>
                                        <td style={{ fontWeight: 600 }}>{team.name}</td>
                                        <td style={{ fontSize: '0.85rem', color: uc ? 'var(--text-primary)' : 'var(--text-muted)' }}>{uc ? `UC #${ucIndex + 1}: ${uc.title}` : 'Not Assigned'}</td>
                                        <td>{uc ? <span className="badge badge-info">R1–R{unlockedRequirements} ({unlockedRequirements}/{uc.requirements.length})</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}</td>
                                        <td>{uc ? <span className="badge badge-success">✅ Assigned</span> : <span className="badge badge-warning">⏳ Pending</span>}</td>
                                        <td>{uc && <button className="btn btn-secondary btn-sm" onClick={() => assignUseCase(team.id, null)}>❌ Unassign</button>}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* All Use Cases */}
            <div className="glass-card section-card">
                <h3>💡 All {useCases.length} Use Cases</h3>
                <div className="content-grid" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
                    {useCases.map((uc, idx) => {
                        const assignedTeams = teams.filter(t => t.use_case_id === uc.id);
                        const isExpanded = expandedUC === uc.id;
                        const visibleReqs = uc.requirements.slice(0, unlockedRequirements);
                        const lockedReqs = uc.requirements.slice(unlockedRequirements);
                        return (
                            <div key={uc.id} className="glass-card usecase-card" style={{ cursor: 'pointer' }} onClick={() => setExpandedUC(isExpanded ? null : uc.id)}>
                                <div className="usecase-number">#{idx + 1}</div>
                                <div className="usecase-title">{uc.title}</div>
                                <div className="usecase-difficulty"><span className="badge badge-warning">{uc.difficulty}</span></div>
                                <div className="usecase-tech">🔧 {uc.tech}</div>
                                <div className="usecase-desc">{uc.objective}</div>

                                {/* Domain Challenge */}
                                {uc.domainChallenge && (
                                    <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', background: 'rgba(255, 0, 110, 0.06)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-magenta)' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-magenta)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>🌐 Domain Challenge</span>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '4px', display: isExpanded ? 'block' : '-webkit-box', WebkitLineClamp: isExpanded ? undefined : 2, WebkitBoxOrient: 'vertical', overflow: isExpanded ? 'visible' : 'hidden' }}>{uc.domainChallenge}</p>
                                    </div>
                                )}

                                {/* Requirements */}
                                <div style={{ marginTop: 'var(--space-sm)' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.05em' }}>📌 REQUIREMENTS — {unlockedRequirements}/{uc.requirements.length} RELEASED</span>
                                    {isExpanded ? (
                                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {visibleReqs.map((req, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', padding: '4px 8px', background: idx >= 5 ? 'rgba(255, 165, 0, 0.06)' : 'rgba(0, 212, 255, 0.04)', borderRadius: '4px' }}>
                                                    <span style={{ color: idx >= 5 ? 'var(--accent-orange)' : 'var(--accent-cyan)', fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: '28px' }}>R{idx + 1}</span>
                                                    <span style={{ color: 'var(--text-secondary)' }}>{req}</span>
                                                    {idx >= 5 && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--accent-orange)' }}>🆕</span>}
                                                </div>
                                            ))}
                                            {lockedReqs.map((req, idx) => (
                                                <div key={`locked-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', opacity: 0.5 }}>
                                                    <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: '28px' }}>R{unlockedRequirements + idx + 1}</span>
                                                    <span style={{ color: 'var(--text-muted)' }}>{req}</span>
                                                    <span style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>🔒</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {visibleReqs.map((_, idx) => (
                                                <span key={idx} style={{ fontSize: '0.65rem', padding: '2px 6px', background: idx >= 5 ? 'rgba(255, 165, 0, 0.15)' : 'rgba(0, 212, 255, 0.08)', borderRadius: '4px', color: idx >= 5 ? 'var(--accent-orange)' : 'var(--text-muted)' }}>R{idx + 1}</span>
                                            ))}
                                            {lockedReqs.length > 0 && (
                                                <span style={{ fontSize: '0.65rem', padding: '2px 6px', color: 'var(--text-muted)' }}>🔒 +{lockedReqs.length}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {assignedTeams.length > 0 && (
                                    <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {assignedTeams.map(t => <span key={t.id} className="chip">Team {t.team_number}</span>)}
                                    </div>
                                )}

                                <div style={{ marginTop: 'var(--space-sm)', textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', cursor: 'pointer' }}>{isExpanded ? '▲ Collapse' : '▼ Expand all'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
