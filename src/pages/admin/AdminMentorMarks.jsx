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
    const { teams, mentorMarks, updateMentorMarks, useCases } = useAppContext();
    const [selectedTeam, setSelectedTeam] = useState('');
    const [marks, setMarks] = useState({});
    const [activeTab, setActiveTab] = useState('phase'); // 'phase' or 'requirement'

    const selectedTeamData = teams.find(t => String(t.id) === selectedTeam);
    const assignedUseCase = selectedTeamData?.use_case_id
        ? useCases.find(u => u.id === selectedTeamData.use_case_id)
        : null;

    const handleTeamSelect = (teamId) => {
        setSelectedTeam(teamId);
        setMarks(mentorMarks[teamId] || {});
    };

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
        ? assignedUseCase.requirements.reduce((sum, _, idx) => sum + (Number(marks[`req_${idx + 1}`]) || 0), 0)
        : 0;
    const reqMax = assignedUseCase ? assignedUseCase.requirements.length * 10 : 0;

    const grandTotal = phaseTotal + reqTotal;
    const grandMax = phaseMax + reqMax;

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">✍️ Mentor Evaluation</h2>
                <p>Phase-wise marks ({phaseMax} max) + Requirement-based marks ({reqMax} max) = {grandMax} total</p>
            </div>

            {/* Team Selection */}
            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3>🎯 Select Team</h3>
                <select className="form-input" value={selectedTeam} onChange={e => handleTeamSelect(e.target.value)} style={{ maxWidth: '500px' }}>
                    <option value="">Select a team...</option>
                    {teams.map(t => {
                        const hasMarks = mentorMarks[t.id];
                        const uc = t.use_case_id ? useCases.find(u => u.id === t.use_case_id) : null;
                        return <option key={t.id} value={t.id}>Team {t.team_number} — {t.name}{uc ? ` [UC #${uc.id}: ${uc.title.substring(0, 30)}]` : ' [No UC]'}{hasMarks ? ' ✅' : ''}</option>;
                    })}
                </select>
            </div>

            {selectedTeam && (
                <>
                    {/* Team Info Card */}
                    <div className="glass-card section-card" style={{ marginBottom: 'var(--space-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                            <div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '4px' }}>{selectedTeamData?.name}</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Team #{selectedTeamData?.team_number}</span>
                                {assignedUseCase && (
                                    <div style={{ marginTop: '4px' }}>
                                        <span className="badge badge-info">UC #{assignedUseCase.id}: {assignedUseCase.title}</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900 }}>
                                    <span className={grandTotal >= (grandMax * 0.7) ? 'gradient-text' : ''} style={{ color: grandTotal < (grandMax * 0.7) ? 'var(--accent-orange)' : undefined }}>{grandTotal}</span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/{grandMax}</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    Phase: {phaseTotal}/{phaseMax} | Req: {reqTotal}/{reqMax}
                                </div>
                            </div>
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
                                        const key = `req_${idx + 1}`;
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
                        <button className="btn btn-primary" onClick={handleSave}>💾 Save All Marks</button>
                        <button className="btn btn-secondary" onClick={() => setMarks({})}>🔄 Reset</button>
                    </div>
                </>
            )}

            {/* Overview Table */}
            <div className="glass-card section-card">
                <h3>📊 All Teams Marks Overview</h3>
                {Object.keys(mentorMarks).length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}><div className="empty-icon">✍️</div><h3>No Marks Yet</h3><p>Select a team above</p></div>
                ) : (
                    <div className="table-container" style={{ border: 'none' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Team</th>
                                    <th>Use Case</th>
                                    {PHASE_CATEGORIES.map(cat => <th key={cat.key}>{cat.label}</th>)}
                                    <th>Phase</th>
                                    <th>Req</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.filter(t => mentorMarks[t.id]).map(team => {
                                    const m = mentorMarks[team.id] || {};
                                    const teamPhaseTotal = PHASE_CATEGORIES.reduce((sum, cat) => sum + (Number(m[cat.key]) || 0), 0);
                                    const uc = team.use_case_id ? useCases.find(u => u.id === team.use_case_id) : null;
                                    const teamReqTotal = uc
                                        ? uc.requirements.reduce((sum, _, idx) => sum + (Number(m[`req_${idx + 1}`]) || 0), 0)
                                        : 0;
                                    const teamGrandTotal = teamPhaseTotal + teamReqTotal;
                                    const teamGrandMax = phaseMax + (uc ? uc.requirements.length * 10 : 0);

                                    return (
                                        <tr key={team.id} style={{ cursor: 'pointer' }} onClick={() => handleTeamSelect(String(team.id))}>
                                            <td><div style={{ fontWeight: 600 }}>{team.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{team.team_number}</div></td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{uc ? `UC #${uc.id}` : '—'}</td>
                                            {PHASE_CATEGORIES.map(cat => (
                                                <td key={cat.key}><div className={`mark-circle ${(m[cat.key] || 0) >= 8 ? 'high' : (m[cat.key] || 0) >= 5 ? 'medium' : 'low'}`} style={{ width: '36px', height: '36px', fontSize: '0.75rem' }}>{m[cat.key] || 0}</div></td>
                                            ))}
                                            <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>{teamPhaseTotal}</span></td>
                                            <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-magenta)' }}>{teamReqTotal}</span></td>
                                            <td><span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: teamGrandTotal >= (teamGrandMax * 0.7) ? 'var(--accent-green)' : 'var(--text-primary)' }}>{teamGrandTotal}</span></td>
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
