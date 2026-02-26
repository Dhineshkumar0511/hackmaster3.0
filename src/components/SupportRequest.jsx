
import React, { useState } from 'react';
import { HelpCircle, Send, X, MessageSquare, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useAppContext } from '../App';

export default function SupportRequest() {
    const { showToast } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ category: 'Direct Support', message: '' });
    const [history, setHistory] = useState([]);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/support', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setHistory(data);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) fetchHistory();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.message.trim()) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                showToast('🚀 Request sent! A mentor is on the way.', 'success');
                setFormData({ ...formData, message: '' });
                fetchHistory();
            }
        } catch (err) {
            showToast('Request failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={toggleOpen}
                className="glass-card"
                style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: '30px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1000,
                    background: 'var(--gradient-primary)',
                    boxShadow: '0 8px 32px rgba(108, 99, 255, 0.4)',
                    border: 'none',
                    color: 'white',
                    transition: 'transform 0.3s ease'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <HelpCircle size={30} />
            </button>

            {isOpen && (
                <div
                    className="glass-card"
                    style={{
                        position: 'fixed',
                        bottom: '100px',
                        right: '30px',
                        width: '380px',
                        maxHeight: '600px',
                        zIndex: 1000,
                        padding: 'var(--space-lg)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        animation: 'fadeInUp 0.3s ease',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Mentor Hook</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Get technical support in minutes</p>
                        </div>
                        <button onClick={toggleOpen} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                        {history.map(req => (
                            <div key={req.id} style={{
                                padding: '10px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '10px',
                                fontSize: '0.8rem',
                                borderLeft: `3px solid ${req.status === 'resolved' ? '#00C49F' : req.status === 'active' ? '#FFBE0B' : 'rgba(255,255,255,0.2)'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>{req.category}</span>
                                    <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div style={{ marginBottom: '6px' }}>{req.message}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem' }}>
                                    {req.status === 'pending' ? <Clock size={10} color="#8338EC" /> : req.status === 'active' ? <Clock size={10} color="#FFBE0B" /> : <CheckCircle size={10} color="#00C49F" />}
                                    <span style={{ color: req.status === 'resolved' ? '#00C49F' : req.status === 'active' ? '#FFBE0B' : 'var(--text-muted)' }}>
                                        {req.status === 'pending' ? 'Waiting for Mentor...' : req.status === 'active' ? `Help on the way: ${req.mentor_name}` : `Resolved by ${req.mentor_name}`}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <select
                                className="form-input"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                style={{ fontSize: '0.8rem' }}
                            >
                                <option value="Direct Support">Technical Issue</option>
                                <option value="Architecture">Architecture Design</option>
                                <option value="Cloud/DevOps">Deployment Help</option>
                                <option value="UI/UX Design">UI/UX Assistance</option>
                                <option value="Bug Fix">Nasty Bug</option>
                            </select>
                            <textarea
                                className="form-input"
                                placeholder="Tell us what's wrong? (Ex: API returning 500 error)"
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                style={{ height: '80px', fontSize: '0.8rem', resize: 'none' }}
                                required
                            />
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', height: '40px' }}>
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} /> Summon Mentor</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
