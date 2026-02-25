import React from 'react';
import { useAppContext } from '../../App';

const PHASE_CATEGORIES = [
    { key: 'phase1', label: 'Phase 1', max: 10 },
    { key: 'phase2', label: 'Phase 2', max: 10 },
    { key: 'phase3', label: 'Phase 3', max: 10 },
    { key: 'innovation', label: 'Innovation', max: 10 },
    { key: 'presentation', label: 'Presentation', max: 10 },
    { key: 'teamwork', label: 'Teamwork', max: 10 },
];

export default function TeamMentorMarks() {
    const { teams, mentorMarks, evaluationResults, submissions, allUseCases, user } = useAppContext();
    const allUCs = [...(allUseCases['2027'] || []), ...(allUseCases['2028'] || [])];

    const myTeam = teams.find(t => t.id === user?.teamId || t.team_number === user?.teamNumber);
    const teamsToDisplay = user?.role === 'admin' ? teams : teams.filter(t => t.id === user?.teamId || t.team_number === user?.teamNumber);

    if (teamsToDisplay.length === 0) {
        return (
            <div className="glass-card" style={{ padding: 'var(--space-2xl)' }}>
                <div className="empty-state">
                    <div className="empty-icon">✍️</div>
                    <h3>No Marks Available</h3>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">📊 Mentor Evaluation Audit</h2>
                <p>Detailed breakdown of mentor-assigned marks and consolidated scoring</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
                {teamsToDisplay.map(team => {
                    const marks = mentorMarks[team.id] || {};
                    const uc = team.use_case_id ? allUCs.find(u => u.id === team.use_case_id) : null;

                    const phaseTotal = PHASE_CATEGORIES.reduce((sum, cat) => sum + (Number(marks[cat.key]) || 0), 0);
                    const normPhase = Math.round((phaseTotal / 60) * 100);

                    let reqTotal = 0;
                    let reqMax = 0;
                    if (uc) {
                        reqMax = uc.requirements.length * 10;
                        for (let i = 1; i <= uc.requirements.length; i++) {
                            reqTotal += (Number(marks[`req${i}`]) || 0);
                        }
                    }
                    const normReq = reqMax > 0 ? Math.round((reqTotal / reqMax) * 100) : 0;

                    const tSubs = submissions.filter(s => s.team_id === team.id || s.team_number === team.team_number);
                    const tEvals = tSubs.map(s => evaluationResults[s.id]).filter(Boolean);
                    const aiScore = tEvals.length ? Math.round(tEvals.reduce((sum, e) => sum + (e.total_score || 0), 0) / tEvals.length) : 0;

                    const grandTotal = Math.round((aiScore + normPhase + normReq) / 3);

                    return (
                        <div key={team.id} className="glass-card section-card" style={{ padding: 'var(--space-xl)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '16px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{team.name}</h3>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Team #{team.team_number} • {uc ? uc.title : 'No UC Assigned'}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>{grandTotal}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Consolidated Total</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)' }}>
                                {/* AI Pillar */}
                                <div>
                                    <h4 style={{ color: 'var(--accent-cyan)', marginBottom: 'var(--space-md)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🤖 AI Technical Audit (33.3%)</h4>
                                    <div className="glass-card" style={{ padding: 'var(--space-md)', background: 'rgba(0, 242, 254, 0.03)' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>{aiScore}%</div>
                                        <div className="progress-bar" style={{ height: '6px', marginBottom: '8px' }}>
                                            <div className="progress-fill" style={{ width: `${aiScore}%`, background: 'var(--gradient-primary)' }} />
                                        </div>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Average of all AI-evaluated submissions across all requirements.</p>
                                    </div>
                                </div>

                                {/* Phase Pillar */}
                                <div>
                                    <h4 style={{ color: 'var(--primary-light)', marginBottom: 'var(--space-md)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>📊 Mentor Phase Marks (33.3%)</h4>
                                    <div className="glass-card" style={{ padding: 'var(--space-md)', background: 'rgba(108, 99, 255, 0.03)' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>{normPhase}%</div>
                                        <div className="progress-bar" style={{ height: '6px', marginBottom: '8px' }}>
                                            <div className="progress-fill" style={{ width: `${normPhase}%`, background: 'var(--gradient-primary)' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <span>Weighted Sum: {phaseTotal}/60</span>
                                            <span>Normalized to 100</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Req Pillar */}
                                <div>
                                    <h4 style={{ color: 'var(--accent-magenta)', marginBottom: 'var(--space-md)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>📌 Requirement Achievement (33.3%)</h4>
                                    <div className="glass-card" style={{ padding: 'var(--space-md)', background: 'rgba(255, 61, 113, 0.03)' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>{normReq}%</div>
                                        <div className="progress-bar" style={{ height: '6px', marginBottom: '8px' }}>
                                            <div className="progress-fill" style={{ width: `${normReq}%`, background: 'var(--gradient-magenta)' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <span>Success Rate: {reqTotal}/{reqMax}</span>
                                            <span>{uc?.requirements.length || 0} Reqs</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed List Toggle/View */}
                            {uc && (
                                <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-md)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                    <h5 style={{ margin: '0 0 12px 0', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Requirement Breakdown</h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                        {uc.requirements.map((req, idx) => {
                                            const val = Number(marks[`req${idx + 1}`]) || 0;
                                            return (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>R{idx + 1}</span>
                                                    <span style={{ fontWeight: 700, color: val >= 8 ? 'var(--accent-green)' : val >= 5 ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>{val}/10</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
