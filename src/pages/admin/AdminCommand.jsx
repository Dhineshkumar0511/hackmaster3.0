
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../App';
import {
    HelpCircle, Clock, CheckCircle, User, MessageSquare,
    ArrowRight, Activity, Zap, Users, Loader2, PlayCircle
} from 'lucide-react';

export default function AdminCommand() {
    const { selectedBatch, setSelectedBatch, supportRequests, showToast, refreshAll, batches } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [mentorName, setMentorName] = useState('Senior Mentor');

    useEffect(() => {
        fetchBatchData();
        const interval = setInterval(fetchBatchData, 10000); // Polling every 10s
        return () => clearInterval(interval);
    }, [selectedBatch]);

    const fetchBatchData = async () => {
        try {
            await refreshAll(); // This will fetch global supportRequests
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const updateStatus = async (id, status) => {
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch(`/api/support/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, mentor_name: mentorName })
            });
            if (res.ok) {
                showToast(`Support status updated to ${status}`, 'success');
                fetchBatchData();
            }
        } catch (err) {
            showToast('Update failed', 'error');
        }
    };

    return (
        <div style={{ padding: 'var(--space-xl)', maxWidth: '1600px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2xl)' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '4rem', fontWeight: 950, letterSpacing: '-3px', lineHeight: 1 }}>War Room</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '10px' }}>⚡ Live Tech Support & Batch Pulse Monitor</p>

                    {/* Explicit Batch Selector */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        {batches.map(b => (
                            <button
                                key={b.id}
                                onClick={() => setSelectedBatch(b.id)}
                                style={{
                                    padding: '10px 25px',
                                    borderRadius: '12px',
                                    border: selectedBatch === b.id ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                                    background: selectedBatch === b.id ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontWeight: 800,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: selectedBatch === b.id ? '0 0 20px rgba(131, 56, 236, 0.3)' : 'none'
                                }}
                            >
                                {b.label}
                            </button>
                        ))}
                        <button
                            onClick={fetchBatchData}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--accent-cyan)',
                                padding: '10px',
                                borderRadius: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            <Activity size={20} />
                        </button>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '250px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent-primary)', display: 'block', marginBottom: '10px', letterSpacing: '1px' }}>MENTOR IDENTITY</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <User size={20} color="var(--text-muted)" />
                        <input
                            className="form-input"
                            value={mentorName}
                            onChange={e => setMentorName(e.target.value)}
                            style={{ background: 'transparent', border: 'none', padding: 0, height: 'auto', fontWeight: 800, fontSize: '1.1rem', color: 'white' }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
                {/* Mentor Hook Queue */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ width: '40px', height: '40px', background: 'var(--gradient-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <HelpCircle color="white" size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Active Support Tickets</h2>
                        <span className="badge" style={{ background: '#FF006E' }}>{supportRequests.filter(r => r.status !== 'resolved').length} LIVE</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {supportRequests.filter(r => r.status !== 'resolved').length === 0 && (
                            <div className="glass-card" style={{ padding: '60px', textAlign: 'center', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Zap size={50} style={{ marginBottom: '20px', color: 'var(--accent-primary)' }} />
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 10px 0' }}>All Clear!</h3>
                                <p style={{ color: 'var(--text-muted)' }}>No teams are currently requesting technical assistance.</p>
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '20px' }}>
                            {supportRequests.filter(r => r.status !== 'resolved').map(req => (
                                <div key={req.id} className="glass-card" style={{
                                    padding: '24px',
                                    borderLeft: `8px solid ${req.status === 'pending' ? '#8338EC' : '#FFBE0B'}`,
                                    animation: 'fadeInLeft 0.3s ease',
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                <span className="badge" style={{ background: 'var(--primary)' }}>TEAM #{req.team_number}</span>
                                                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{req.category}</span>
                                            </div>
                                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>{req.team_name}</h3>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(req.created_at).toLocaleTimeString()}</div>
                                            <div style={{ color: req.status === 'pending' ? '#8338EC' : '#FFBE0B', fontWeight: 950, fontSize: '0.8rem', letterSpacing: '1px', marginTop: '5px' }}>
                                                {req.status === 'pending' ? '🔴 PENDING' : '🟡 ACTIVE'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '1.05rem', lineHeight: 1.5 }}>
                                        {req.message}
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {req.status === 'pending' ? (
                                            <button className="btn btn-primary" onClick={() => updateStatus(req.id, 'active')} style={{ flex: 1, height: '45px', fontWeight: 800 }}>
                                                <Zap size={18} /> Claim Ticket
                                            </button>
                                        ) : (
                                            <button className="btn btn-primary" onClick={() => updateStatus(req.id, 'resolved')} style={{ flex: 1, background: 'var(--accent-green)', height: '45px', fontWeight: 800 }}>
                                                <CheckCircle size={18} /> Resolve Issue
                                            </button>
                                        )}
                                        <button className="btn" onClick={() => updateStatus(req.id, 'resolved')} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', opacity: 0.5, padding: '0 20px' }}>Dismiss</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resolved History */}
                    <div style={{ marginTop: 'var(--space-3xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-lg)' }}>
                            <CheckCircle size={20} color="var(--accent-green)" />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, opacity: 0.7 }}>Recently Resolved</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                            {supportRequests.filter(r => r.status === 'resolved').slice(0, 6).map(req => (
                                <div key={req.id} className="glass-card" style={{ padding: '20px', opacity: 0.6, border: '1px solid rgba(0,196,159,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>T#{req.team_number} • {req.mentor_name}</span>
                                        <span style={{ fontSize: '0.7rem', color: '#00C49F', fontWeight: 700 }}>RESOLVED</span>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', margin: '10px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{req.message}</p>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                                        Completed at {new Date(req.resolved_at).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
