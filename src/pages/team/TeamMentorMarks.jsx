import React from 'react';
import { useAppContext } from '../../App';

export default function TeamMentorMarks() {
    const { teams, mentorMarks } = useAppContext();

    const teamsWithMarks = teams.filter(t => mentorMarks[t.id]);

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">📊 Mentor Marks</h2>
                <p>Mentor evaluation marks for all teams</p>
            </div>

            {teamsWithMarks.length === 0 ? (
                <div className="glass-card" style={{ padding: 'var(--space-2xl)' }}>
                    <div className="empty-state">
                        <div className="empty-icon">✍️</div>
                        <h3>No Mentor Marks Yet</h3>
                        <p>Mentor marks will appear here once the admin enters them</p>
                    </div>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Team</th>
                                <th>Phase 1</th>
                                <th>Phase 2</th>
                                <th>Phase 3</th>
                                <th>Innovation</th>
                                <th>Presentation</th>
                                <th>Teamwork</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamsWithMarks.map(team => {
                                const marks = mentorMarks[team.id] || {};
                                const total = Object.values(marks).reduce((a, b) => a + (Number(b) || 0), 0);
                                return (
                                    <tr key={team.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{team.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team #{team.teamNumber}</div>
                                        </td>
                                        <td>
                                            <div className={`mark-circle ${(marks.phase1 || 0) >= 8 ? 'high' : (marks.phase1 || 0) >= 5 ? 'medium' : 'low'}`}
                                                style={{ width: '38px', height: '38px', fontSize: '0.8rem' }}>
                                                {marks.phase1 || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`mark-circle ${(marks.phase2 || 0) >= 8 ? 'high' : (marks.phase2 || 0) >= 5 ? 'medium' : 'low'}`}
                                                style={{ width: '38px', height: '38px', fontSize: '0.8rem' }}>
                                                {marks.phase2 || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`mark-circle ${(marks.phase3 || 0) >= 8 ? 'high' : (marks.phase3 || 0) >= 5 ? 'medium' : 'low'}`}
                                                style={{ width: '38px', height: '38px', fontSize: '0.8rem' }}>
                                                {marks.phase3 || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`mark-circle ${(marks.innovation || 0) >= 8 ? 'high' : (marks.innovation || 0) >= 5 ? 'medium' : 'low'}`}
                                                style={{ width: '38px', height: '38px', fontSize: '0.8rem' }}>
                                                {marks.innovation || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`mark-circle ${(marks.presentation || 0) >= 8 ? 'high' : (marks.presentation || 0) >= 5 ? 'medium' : 'low'}`}
                                                style={{ width: '38px', height: '38px', fontSize: '0.8rem' }}>
                                                {marks.presentation || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`mark-circle ${(marks.teamwork || 0) >= 8 ? 'high' : (marks.teamwork || 0) >= 5 ? 'medium' : 'low'}`}
                                                style={{ width: '38px', height: '38px', fontSize: '0.8rem' }}>
                                                {marks.teamwork || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: total >= 40 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                                                {total}
                                            </span>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 60</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
