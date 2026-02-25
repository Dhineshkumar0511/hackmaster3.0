import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../App';

const PHASE_CATEGORIES = [
    { key: 'phase1', label: 'Phase 1', max: 10, desc: 'Problem understanding & initial progress' },
    { key: 'phase2', label: 'Phase 2', max: 10, desc: 'Core implementation & innovation' },
    { key: 'phase3', label: 'Phase 3', max: 10, desc: 'Stability, performance & completion' },
    { key: 'innovation', label: 'Innovation', max: 10, desc: 'Creative approach & extra features' },
    { key: 'presentation', label: 'Presentation', max: 10, desc: 'Demo quality & communication' },
    { key: 'teamwork', label: 'Teamwork', max: 10, desc: 'Collaboration & adaptability' },
];

export default function AdminMentorMarks() {
    const { teams, mentorMarks, updateMentorMarks, deleteAllMentorMarks, evaluationResults, submissions, allUseCases, batches, selectedBatch, setSelectedBatch } = useAppContext();
    const [selectedTeam, setSelectedTeam] = useState('');
    const [marks, setMarks] = useState({});
    const [activeTab, setActiveTab] = useState('phase'); // 'phase' or 'requirement'

    const allUCs = [...(allUseCases['2027'] || []), ...(allUseCases['2028'] || [])];

    const selectedTeamData = teams.find(t => String(t.id) === selectedTeam);
    const assignedUseCase = selectedTeamData?.use_case_id
        ? allUCs.find(u => u.id === selectedTeamData.use_case_id)
        : null;

    const handleTeamSelect = (teamId) => {
        if (!teamId) {
            setSelectedTeam('');
            setMarks({});
            return;
        }
        setSelectedTeam(teamId);
        // Ensure numeric lookup for context marks and set immediately
        const existingMarks = mentorMarks[Number(teamId)] || {};
        setMarks(existingMarks);
    };

    React.useEffect(() => {
        if (selectedTeam) {
            const contextMarks = mentorMarks[Number(selectedTeam)] || {};
            setMarks(contextMarks);
        } else {
            setMarks({});
        }
    }, [mentorMarks, selectedTeam]);

    const handleMarkChange = (key, value, max = 10) => {
        const numVal = Math.min(max, Math.max(0, parseInt(value) || 0));
        setMarks(prev => ({ ...prev, [key]: numVal }));
    };

    const handleSave = () => {
        if (!selectedTeam) return;
        updateMentorMarks(parseInt(selectedTeam), marks);
    };

    // Phase-based total
    const phaseTotal = PHASE_CATEGORIES.reduce((sum, cat) => sum + (Number(marks[cat.key]) || 0), 0);
    const phaseMax = PHASE_CATEGORIES.reduce((sum, cat) => sum + cat.max, 0);

    // Requirement-based total
    const reqTotal = assignedUseCase
        ? assignedUseCase.requirements.reduce((sum, _, idx) => sum + (Number(marks[`req${idx + 1}`]) || 0), 0)
        : 0;
    const reqMax = assignedUseCase ? assignedUseCase.requirements.length * 10 : 0;

    // AI Score (average)
    const teamSubs = submissions.filter(s => s.team_id === parseInt(selectedTeam) || s.team_number === selectedTeamData?.team_number);
    const teamEvals = teamSubs.map(s => evaluationResults[s.id]).filter(Boolean);
    const aiScore = teamEvals.length ? Math.round(teamEvals.reduce((sum, e) => sum + (e.total_score || 0), 0) / teamEvals.length) : 0;

    // Normalizations
    const normAi = aiScore;
    const normPhase = Math.round((phaseTotal / 60) * 100);
    const normReq = reqMax > 0 ? Math.round((reqTotal / reqMax) * 100) : 0;

    const grandConsolidated = Math.round((normAi + normPhase + normReq) / 3);

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">✍️ Mentor Evaluation</h2>
                <p>Consolidated Score: Average of (AI Audit + Phase Marks + Req Marks)</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {batches.map(b => (
                        <button key={b.id} onClick={() => { setSelectedBatch(b.id); setSelectedTeam(''); }} style={{
                            padding: '10px 24px', borderRadius: '12px',
                            border: selectedBatch === b.id ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                            background: selectedBatch === b.id ? 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' : 'rgba(255,255,255,0.05)',
                            color: selectedBatch === b.id ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        }}>🎓 {b.label}</button>
                    ))}
                </div>
                <button className="btn btn-danger btn-sm" onClick={deleteAllMentorMarks}>🗑️ Clear Batch Marks</button>
            </div>

            {/* Team Selection */}
            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3>🎯 Select {selectedBatch === '2027' ? '3rd Year' : '2nd Year'} Team</h3>
                <select className="form-input" value={selectedTeam} onChange={e => handleTeamSelect(e.target.value)} style={{ maxWidth: '500px' }}>
                    <option value="">Select a team...</option>
                    {teams.map(t => {
                        const hasMarks = mentorMarks[t.id];
                        const uc = t.use_case_id ? allUCs.find(u => u.id === t.use_case_id) : null;
                        return <option key={t.id} value={t.id}>Team {t.team_number} — {t.name}{uc ? ` [UC #${uc.id}]` : ' [No UC]'}{hasMarks ? ' ✅' : ''}</option>;
                    })}
                </select>
            </div>

            {selectedTeam && (
                <>
                    {/* Consolidated Score Card */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                        <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>{normAi}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AI Audit Average</div>
                        </div>
                        <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-light)' }}>{normPhase}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Phase Marks (Norm)</div>
                        </div>
                        <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-magenta)' }}>{normReq}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Requirement Marks</div>
                        </div>
                        <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center', background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(0, 242, 254, 0.1))', border: '1px solid var(--primary)' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900 }} className="gradient-text">{grandConsolidated}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>CONSOLIDATED TOTAL</div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="tabs" style={{ marginBottom: 'var(--space-xl)' }}>
                        <button className={`tab ${activeTab === 'phase' ? 'active' : ''}`} onClick={() => setActiveTab('phase')}>
                            📊 Phase Marks ({phaseTotal}/{phaseMax})
                        </button>
                        <button className={`tab ${activeTab === 'requirement' ? 'active' : ''}`} onClick={() => setActiveTab('requirement')}>
                            📌 Requirement Marks ({reqTotal}/{reqMax})
                        </button>
                    </div>

                    {/* Phase Marks Tab */}
                    {activeTab === 'phase' && (
                        <div className="glass-card mentor-marks-card" style={{ marginBottom: 'var(--space-xl)' }}>
                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: 'var(--space-lg)' }}>📊 Phase-wise Evaluation (6 × 10 = {phaseMax})</h4>
                            {PHASE_CATEGORIES.map(cat => (
                                <div key={cat.key} className="mark-input-group">
                                    <div style={{ minWidth: '140px' }}>
                                        <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{cat.label}</label>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cat.desc}</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="progress-bar" style={{ height: '10px' }}>
                                            <div className="progress-fill" style={{ width: `${((marks[cat.key] || 0) / cat.max) * 100}%`, background: (marks[cat.key] || 0) >= 8 ? 'var(--gradient-success)' : (marks[cat.key] || 0) >= 5 ? 'var(--gradient-primary)' : 'var(--gradient-danger)' }} />
                                        </div>
                                    </div>
                                    <input className="form-input" type="number" min="0" max={cat.max} value={marks[cat.key] || ''} onChange={e => handleMarkChange(cat.key, e.target.value, cat.max)} style={{ width: '70px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }} placeholder="0" />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '30px' }}>/{cat.max}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Requirement Marks Tab */}
                    {activeTab === 'requirement' && (
                        <div className="glass-card mentor-marks-card" style={{ marginBottom: 'var(--space-xl)' }}>
                            {assignedUseCase ? (
                                <>
                                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--accent-magenta)', marginBottom: 'var(--space-sm)' }}>📌 Requirement-based Marks ({assignedUseCase.requirements.length} × 10 = {reqMax})</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>UC #{assignedUseCase.id}: {assignedUseCase.title}</p>

                                    {assignedUseCase.requirements.map((req, idx) => {
                                        const key = `req${idx + 1}`;
                                        const val = marks[key] || 0;
                                        return (
                                            <div key={idx} className="mark-input-group">
                                                <div style={{ minWidth: '50px' }}>
                                                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>R{idx + 1}</span>
                                                </div>
                                                <div style={{ flex: 1, minWidth: '150px' }}>
                                                    <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block' }}>{req}</label>
                                                </div>
                                                <div style={{ flex: 0.5, minWidth: '80px' }}>
                                                    <div className="progress-bar" style={{ height: '8px' }}>
                                                        <div className="progress-fill" style={{ width: `${(val / 10) * 100}%`, background: val >= 8 ? 'var(--gradient-success)' : val >= 5 ? 'var(--gradient-primary)' : 'var(--gradient-danger)' }} />
                                                    </div>
                                                </div>
                                                <input className="form-input" type="number" min="0" max="10" value={marks[key] || ''} onChange={e => handleMarkChange(key, e.target.value, 10)} style={{ width: '60px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }} placeholder="0" />
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '20px' }}>/10</span>
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                                    <div className="empty-icon">📌</div>
                                    <h3>No Use Case Assigned</h3>
                                    <p>This team has no assigned use case. Assign one first to enable requirement-based marking.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Save/Reset */}
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
                        <button className="btn btn-primary" onClick={handleSave}>💾 Save Marks for Team #{selectedTeamData?.team_number}</button>
                        <button className="btn btn-secondary" onClick={() => setMarks({})}>🔄 Reset Fields</button>
                    </div>
                </>
            )}

            {/* Overview Table */}
            <div className="glass-card section-card">
                <h3>📊 Teams Consolidated Score Overview — Batch {selectedBatch}</h3>
                {teams.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}><div className="empty-icon">👥</div><h3>No Teams in this Batch</h3></div>
                ) : (
                    <div className="table-container" style={{ border: 'none' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Team</th>
                                    <th>AI Audit</th>
                                    <th>Phase (100)</th>
                                    <th>Req (100)</th>
                                    <th>Consolidated</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map(team => {
                                    const m = mentorMarks[team.id] || {};
                                    const tPhaseTotal = PHASE_CATEGORIES.reduce((sum, cat) => sum + (Number(m[cat.key]) || 0), 0);
                                    const uc = team.use_case_id ? allUCs.find(u => u.id === team.use_case_id) : null;

                                    let tReqTotal = 0;
                                    let tReqMax = 0;
                                    if (uc) {
                                        tReqMax = uc.requirements.length * 10;
                                        for (let i = 1; i <= uc.requirements.length; i++) {
                                            tReqTotal += (Number(m[`req${i}`]) || 0);
                                        }
                                    }

                                    const tSubs = submissions.filter(s => s.team_id === team.id || s.team_number === team.team_number);
                                    const tEvals = tSubs.map(s => evaluationResults[s.id]).filter(Boolean);
                                    const tAiScore = tEvals.length ? Math.round(tEvals.reduce((sum, e) => sum + (e.total_score || 0), 0) / tEvals.length) : 0;

                                    const tNormPhase = Math.round((tPhaseTotal / 60) * 100);
                                    const tNormReq = tReqMax > 0 ? Math.round((tReqTotal / tReqMax) * 100) : 0;
                                    const tConsolidated = Math.round((tAiScore + tNormPhase + tNormReq) / 3);

                                    return (
                                        <tr key={team.id} style={{
                                            cursor: 'pointer',
                                            borderLeft: selectedTeam === String(team.id) ? '4px solid var(--primary)' : 'none',
                                            background: selectedTeam === String(team.id) ? 'rgba(108, 99, 255, 0.05)' : 'transparent'
                                        }} onClick={() => handleTeamSelect(String(team.id))}>
                                            <td><div style={{ fontWeight: 600 }}>{team.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{team.team_number}</div></td>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>{tAiScore}%</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-light)' }}>{tNormPhase}% <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>({tPhaseTotal}/60)</span></td>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-magenta)' }}>{tNormReq}% <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>({tReqTotal}/{tReqMax})</span></td>
                                            <td>
                                                <span style={{
                                                    fontFamily: 'var(--font-display)',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 800,
                                                    color: tConsolidated >= 70 ? 'var(--accent-green)' : 'var(--text-primary)'
                                                }}>
                                                    {tConsolidated}
                                                </span>
                                            </td>
                                            <td>{mentorMarks[team.id] ? <span className="badge badge-success">Marked</span> : <span className="badge badge-warning">Pending</span>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
