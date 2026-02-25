import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: `${2 + Math.random() * 4}px`,
    duration: `${8 + Math.random() * 12}s`,
    delay: `${Math.random() * 8}s`,
    color: ['#6C63FF', '#00D4FF', '#FF006E', '#00F5A0'][Math.floor(Math.random() * 4)],
}));

export default function LoginPage() {
    const { login } = useAppContext();
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const user = await login(formData.username, formData.password);
            navigate(user.role === 'admin' ? '/admin' : '/team');
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        }
        setIsLoading(false);
    };

    return (
        <div className="login-page">
            {/* Animated Particles */}
            <div className="particles">
                {PARTICLES.map(p => (
                    <div
                        key={p.id}
                        className="particle"
                        style={{
                            left: p.left,
                            width: p.size,
                            height: p.size,
                            background: p.color,
                            animationDuration: p.duration,
                            animationDelay: p.delay,
                        }}
                    />
                ))}
            </div>

            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo gradient-text">HACKMASTER</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span className="badge badge-primary">v3.0</span>
                            <span className="badge badge-info">2026</span>
                        </div>
                        <p className="login-subtitle" style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                            🏥 Healthcare AI Hackathon<br />
                            <span style={{ color: 'var(--accent-cyan)' }}>Sri Manakula Vinayagar Engineering College</span><br />
                            AI & Data Science Department
                        </p>

                        {/* Club Logos */}
                        <div className="club-logos" style={{ marginTop: '16px' }}>
                            <div className="club-logo">
                                <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4FF)', color: 'white', fontSize: '0.7rem' }}>IA</div>
                                <span className="logo-name">InfitiAid</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>×</div>
                            <div className="club-logo">
                                <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #FF006E, #FF8C00)', color: 'white', fontSize: '0.7rem' }}>ID</div>
                                <span className="logo-name">IDSC</span>
                            </div>
                        </div>
                    </div>

                    {/* Role Tabs */}
                    <div className="tabs" style={{ justifyContent: 'center', borderBottom: 'none', marginBottom: '16px' }}>
                        <button
                            className={`tab ${!isAdmin ? 'active' : ''}`}
                            onClick={() => { setIsAdmin(false); setError(''); setFormData({ username: '', password: '' }); }}
                        >
                            👥 Team Leader
                        </button>
                        <button
                            className={`tab ${isAdmin ? 'active' : ''}`}
                            onClick={() => { setIsAdmin(true); setError(''); setFormData({ username: 'admin', password: '' }); }}
                        >
                            🔑 Admin
                        </button>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        {isAdmin ? (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Admin Username</label>
                                    <input
                                        className="form-input"
                                        placeholder="admin"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        autoComplete="username"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Admin Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Enter admin password..."
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        autoComplete="current-password"
                                    />
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    🔐 Default: <code style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>admin / hackmaster2026</code>
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Team Username</label>
                                    <select
                                        className="form-input"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    >
                                        <option value="">Select your team...</option>
                                        {Array.from({ length: 28 }, (_, i) => (
                                            <option key={i + 1} value={`team${i + 1}`}>Team {i + 1} — team{i + 1}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Enter team password..."
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        autoComplete="current-password"
                                    />
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    🔐 Default password: <code style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>team1@hack</code> (replace 1 with your team #)
                                </p>
                            </>
                        )}

                        {error && (
                            <div style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 61, 113, 0.1)',
                                border: '1px solid rgba(255, 61, 113, 0.3)',
                                color: 'var(--accent-red)',
                                fontSize: '0.85rem',
                                textAlign: 'center',
                            }}>
                                ❌ {error}
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={isLoading}>
                            {isLoading ? '⏳ Logging in...' : isAdmin ? '🔓 Access Admin Panel' : '🚀 Login as Team Leader'}
                        </button>
                    </form>

                    <div className="login-toggle">
                        <button onClick={() => { setIsAdmin(!isAdmin); setError(''); setFormData({ username: isAdmin ? '' : 'admin', password: '' }); }}>
                            {isAdmin ? '← Switch to Team Leader Login' : 'Admin Login →'}
                        </button>
                    </div>
                </div>

                <p style={{
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    marginTop: '20px',
                }}>
                    © 2026 SMVEC AI&DS Department | HackMaster 3.0
                </p>
            </div>
        </div>
    );
}
