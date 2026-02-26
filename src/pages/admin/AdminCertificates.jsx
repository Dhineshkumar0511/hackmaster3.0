
import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Award, Trash2, Search } from 'lucide-react';

export default function AdminCertificates() {
    const { teams, certificates, fetchCertificates, selectedBatch, batches, setSelectedBatch, showToast } = useAppContext();
    const [issuing, setIssuing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTeams = (teams || []).filter(t =>
        t.batch === selectedBatch &&
        (t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.team_number.toString().includes(searchTerm))
    );

    const certList = certificates || [];

    const issueCertificate = async (teamId, type) => {
        setIssuing(true);
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/certificates', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ teamId, type })
            });
            if (res.ok) {
                showToast(`Certificate (${type}) issued successfully!`, 'success');
                fetchCertificates();
            }
        } catch (err) {
            showToast('Failed to issue certificate', 'error');
        } finally {
            setIssuing(false);
        }
    };

    const removeCertificate = async (id) => {
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch(`/api/certificates/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Certificate removed', 'success');
                fetchCertificates();
            }
        } catch (err) {
            showToast('Failed to remove certificate', 'error');
        }
    };

    const bulkIssueParticipation = async () => {
        if (!window.confirm('Issue participation certificates to all teams in this batch?')) return;
        setIssuing(true);
        try {
            const token = localStorage.getItem('hackmaster_token');
            for (const team of filteredTeams) {
                if (!certList.find(c => c.team_id === team.id && c.type === 'participation')) {
                    await fetch('/api/certificates', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ teamId: team.id, type: 'participation' })
                    });
                }
            }
            showToast('Bulk issuance complete!', 'success');
            fetchCertificates();
        } catch (err) {
            showToast('Failed in bulk issuance', 'error');
        } finally {
            setIssuing(false);
        }
    };

    return (
        <div style={{ padding: 'var(--space-xl)', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2xl)', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-2px' }}>📜 Certificate Portal</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Issue academic validation certificates for Batch {selectedBatch}</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Batch Selector */}
                    {(batches || []).map(b => (
                        <button key={b.id} onClick={() => setSelectedBatch(b.id)} style={{
                            padding: '8px 20px', borderRadius: '10px',
                            border: selectedBatch === b.id ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                            background: selectedBatch === b.id ? 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' : 'rgba(255,255,255,0.05)',
                            color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.3s ease'
                        }}>🎓 {b.label}</button>
                    ))}
                    <button className="btn btn-secondary" onClick={bulkIssueParticipation} disabled={issuing} style={{ fontSize: '0.85rem' }}>
                        📦 Bulk Participation
                    </button>
                    <div className="glass-card" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input
                            placeholder="Search teams..."
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '120px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: 'var(--space-xl)' }}>
                <div className="glass-card" style={{ padding: '15px 25px', flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900 }} className="gradient-text">{filteredTeams.length}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TEAMS</div>
                </div>
                <div className="glass-card" style={{ padding: '15px 25px', flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>{certList.filter(c => c.type === 'participation').length}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PARTICIPATION</div>
                </div>
                <div className="glass-card" style={{ padding: '15px 25px', flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFD700' }}>{certList.filter(c => c.type === 'top_performer').length}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOP PERFORMER</div>
                </div>
            </div>

            {/* Teams Table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <tr>
                            <th style={{ padding: '18px 20px', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px' }}>TEAM</th>
                            <th style={{ padding: '18px 20px', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px' }}>MEMBERS</th>
                            <th style={{ padding: '18px 20px', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px' }}>CERTIFICATES</th>
                            <th style={{ padding: '18px 20px', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeams.map(team => {
                            const teamCerts = certList.filter(c => c.team_id === team.id);
                            const hasParticipation = teamCerts.some(c => c.type === 'participation');
                            const hasTopPerformer = teamCerts.some(c => c.type === 'top_performer');
                            return (
                                <tr key={team.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '18px 20px' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>#{team.team_number} {team.name}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '2px' }}>Batch {team.batch}</div>
                                    </td>
                                    <td style={{ padding: '18px 20px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {(team.members || []).length > 0 ? (
                                                team.members.map((m, i) => (
                                                    <span key={i} className="badge" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.65rem' }}>
                                                        {typeof m === 'string' ? m : (m.name || 'Member')}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ opacity: 0.3, fontSize: '0.75rem' }}>Not registered</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '18px 20px' }}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {teamCerts.map(cert => (
                                                <div key={cert.id} style={{
                                                    background: cert.type === 'top_performer' ? 'linear-gradient(45deg, #FFD700, #FFA500)' : 'rgba(0,196,159,0.2)',
                                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900,
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    color: cert.type === 'top_performer' ? '#1a1a1a' : '#00C49F'
                                                }}>
                                                    <Award size={12} /> {cert.type === 'top_performer' ? 'TOP PERFORMER' : 'PARTICIPATION'}
                                                    <Trash2 size={11} style={{ cursor: 'pointer', marginLeft: '4px', opacity: 0.7 }} onClick={() => removeCertificate(cert.id)} />
                                                </div>
                                            ))}
                                            {teamCerts.length === 0 && <span style={{ opacity: 0.25, fontSize: '0.75rem' }}>—</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '18px 20px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => issueCertificate(team.id, 'participation')}
                                                disabled={issuing || hasParticipation}
                                                style={{ fontSize: '0.75rem', opacity: hasParticipation ? 0.3 : 1 }}
                                            >
                                                {hasParticipation ? '✅ Issued' : '📄 Participation'}
                                            </button>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => issueCertificate(team.id, 'top_performer')}
                                                disabled={issuing || hasTopPerformer}
                                                style={{ fontSize: '0.75rem', background: hasTopPerformer ? 'rgba(255,215,0,0.2)' : 'linear-gradient(45deg, #FFD700, #FFA500)', color: hasTopPerformer ? '#FFD700' : '#1a1a1a', opacity: hasTopPerformer ? 0.5 : 1 }}
                                            >
                                                {hasTopPerformer ? '🏆 Issued' : '🏆 Top Performer'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Certificates issued above will appear instantly in the Student Portal under the "📜 Certificates" tab.
                </p>
            </div>
        </div>
    );
}
