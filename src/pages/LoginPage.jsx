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
    const [showPassword, setShowPassword] = useState(false);

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
        <div className="login-page" style={{ display: 'flex', flexDirection: 'row' }}>
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

            {/* LEFT SIDE — Branding & Info */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 'var(--space-3xl)',
                position: 'relative',
                zIndex: 1,
                background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.08) 0%, rgba(0, 212, 255, 0.04) 100%)',
                borderRight: '1px solid rgba(108, 99, 255, 0.15)',
            }}>
                <div style={{ maxWidth: '500px', textAlign: 'center' }}>
                    {/* Logo */}
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <h1 className="gradient-text" style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '3rem',
                            fontWeight: 900,
                            letterSpacing: '0.15em',
                            lineHeight: 1.1,
                            marginBottom: '8px',
                        }}>
                            HACKMASTER
                        </h1>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                            <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>v3.0</span>
                            <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>2026</span>
                        </div>
                    </div>

                    {/* Institution */}
                    <div style={{
                        background: 'rgba(17, 17, 40, 0.6)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-xl)',
                        border: '1px solid rgba(108, 99, 255, 0.15)',
                        marginBottom: 'var(--space-xl)',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏥</div>
                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--accent-cyan)',
                            marginBottom: '8px',
                            letterSpacing: '0.05em',
                        }}>
                            Healthcare AI Hackathon
                        </h2>
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            Sri Manakula Vinayagar Engineering College
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Department of AI & Data Science
                        </p>
                    </div>

                    {/* Event Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                        <div className="glass-card" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>📅</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event Date</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-green)' }}>07 – 08 Mar 2026</div>
                        </div>
                        <div className="glass-card" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>👥</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Teams</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-orange)' }}>56 Teams (2 Batches)</div>
                        </div>
                        <div className="glass-card" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🧠</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Technology</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>AI + Python + Cloud</div>
                        </div>
                        <div className="glass-card" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>💡</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Use Cases</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-magenta)' }}>28 Challenges</div>
                        </div>
                    </div>

                    {/* Club Logos */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-lg)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #6C63FF, #00D4FF)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem', fontWeight: 800, color: 'white', margin: '0 auto 6px',
                            }}>IA</div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>InfitiAid Club</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 300 }}>×</div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #FF006E, #FF8C00)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem', fontWeight: 800, color: 'white', margin: '0 auto 6px',
                            }}>ID</div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IDSC Club</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE — Login Form */}
            <div style={{
                width: '480px',
                minWidth: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 'var(--space-3xl)',
                position: 'relative',
                zIndex: 1,
            }}>
                <div style={{ width: '100%', maxWidth: '380px' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-primary)',
                    }}>
                        {isAdmin ? '🔑 Admin Access' : '🚀 Team Login'}
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>
                        {isAdmin ? 'Access the admin control panel' : 'Login to your team dashboard'}
                    </p>

                    {/* Role Tabs */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 'var(--radius-md)',
                        padding: '4px',
                        marginBottom: 'var(--space-xl)',
                    }}>
                        <button
                            onClick={() => { setIsAdmin(false); setError(''); setFormData({ username: '', password: '' }); }}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                background: !isAdmin ? 'var(--gradient-primary)' : 'transparent',
                                color: !isAdmin ? 'white' : 'var(--text-muted)',
                                boxShadow: !isAdmin ? '0 4px 12px rgba(108, 99, 255, 0.3)' : 'none',
                            }}
                        >
                            👥 Team Leader
                        </button>
                        <button
                            onClick={() => { setIsAdmin(true); setError(''); setFormData({ username: '', password: '' }); }}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                background: isAdmin ? 'var(--gradient-primary)' : 'transparent',
                                color: isAdmin ? 'white' : 'var(--text-muted)',
                                boxShadow: isAdmin ? '0 4px 12px rgba(108, 99, 255, 0.3)' : 'none',
                            }}
                        >
                            🔑 Admin
                        </button>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        {isAdmin ? (
                            <>
                                <div className="form-group">
                                    <label className="form-label">USERNAME</label>
                                    <input
                                        className="form-input"
                                        placeholder="Enter admin username"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        autoComplete="username"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">PASSWORD</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="Enter admin password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            autoComplete="current-password"
                                            style={{ paddingRight: '48px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-muted)',
                                                fontSize: '1.1rem',
                                                cursor: 'pointer',
                                                padding: '4px',
                                            }}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label className="form-label">TEAM USERNAME</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. team1 or 2y_team1"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        autoComplete="username"
                                    />
                                    <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                        <span style={{ color: 'var(--accent-cyan)' }}>3rd Year:</span> team1 – team28 &nbsp;|&nbsp;
                                        <span style={{ color: 'var(--accent-orange)' }}>2nd Year:</span> 2y_team1 – 2y_team28
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">PASSWORD</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="Enter your team password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            autoComplete="current-password"
                                            style={{ paddingRight: '48px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-muted)',
                                                fontSize: '1.1rem',
                                                cursor: 'pointer',
                                                padding: '4px',
                                            }}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                background: 'rgba(255, 61, 113, 0.1)',
                                border: '1px solid rgba(255, 61, 113, 0.3)',
                                color: 'var(--accent-red)',
                                fontSize: '0.85rem',
                                textAlign: 'center',
                            }}>
                                ❌ {error}
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }} disabled={isLoading}>
                            {isLoading ? '⏳ Logging in...' : isAdmin ? '🔓 Access Admin Panel' : '🚀 Login as Team Leader'}
                        </button>
                    </form>

                    <p style={{
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        marginTop: 'var(--space-2xl)',
                    }}>
                        © 2026 SMVEC AI&DS Department | HackMaster 3.0
                    </p>
                </div>
            </div>
        </div>
    );
}
