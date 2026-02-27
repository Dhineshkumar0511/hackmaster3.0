
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Loader2, UserPlus, Users, Trash2, Shield, Upload, AlertCircle } from 'lucide-react';

export default function AdminUserManagement() {
    const { showToast, selectedBatch } = useAppContext();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' or 'add'
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'team', teamNumber: '', teamName: '', batch: selectedBatch });
    const [bulkJson, setBulkJson] = useState('');
    const [wipeBatch, setWipeBatch] = useState(selectedBatch);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && Array.isArray(data)) {
                setUsers(data);
            } else {
                console.error('API Error:', data);
                showToast(data.error || 'Failed to fetch directory', 'error');
                setUsers([]);
            }
        } catch (err) {
            console.error('Fetch Error:', err);
            showToast('Protocol Link Failure', 'error');
            setUsers([]);
        }
        setLoading(false);
    };

    const handleAddSingle = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newUser)
            });
            if (res.ok) {
                showToast('Authorized new identity', 'success');
                setNewUser({ username: '', password: '', role: 'team', teamNumber: '', teamName: '', batch: selectedBatch });
                fetchUsers();
                setView('list');
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to authorize', 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        }
    };

    const handleBulkAdd = async () => {
        try {
            const usersArray = JSON.parse(bulkJson);
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/users/bulk', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ users: usersArray })
            });
            const data = await res.json();
            showToast(`Synchronized ${data.success} identities. Errors: ${data.fail}`, data.fail === 0 ? 'success' : 'warning');
            fetchUsers();
            setView('list');
            setBulkJson('');
        } catch (err) {
            showToast('Invalid JSON structure', 'error');
        }
    };

    const deleteUser = async (id, username) => {
        if (!window.confirm(`🚨 TERMINATE identity "${username}"?`)) return;
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Identity purged', 'info');
                fetchUsers();
            }
        } catch (err) {
            showToast('Termination failed', 'error');
        }
    };

    const deleteAllUsers = async () => {
        const batchToWipe = wipeBatch || 'All';
        if (!window.confirm(`🚨 CRITICAL: Wipe ALL student identities from ${batchToWipe === 'All' ? 'EVERY BATCH' : `Batch ${batchToWipe}`}? This is PERMANENT.`)) return;

        try {
            const token = localStorage.getItem('hackmaster_token');
            const url = batchToWipe === 'All' ? '/api/users/batch/all' : `/api/users/batch/${batchToWipe}`;
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast(`Wipe successful: ${batchToWipe}`, 'success');
                fetchUsers();
            }
        } catch (err) {
            showToast('Wipe command failed', 'error');
        }
    };

    return (
        <div style={{
            padding: '40px',
            width: '100%',
            maxWidth: '1600px',
            margin: '0 auto',
            animation: 'fadeIn 0.5s ease-out',
            boxSizing: 'border-box'
        }}>
            {/* Elegant Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '50px',
                gap: '30px',
                flexWrap: 'wrap'
            }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 950, letterSpacing: '-3px', lineHeight: 0.9, marginBottom: '20px' }}>Access Control</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-magenta)', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 10px currentColor' }}></div>
                            Identity Manager
                        </div>
                        <span style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }}></span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                            {users.length} active security accounts
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="glass-card" style={{ display: 'flex', padding: '4px', gap: '4px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <button onClick={() => setView('list')} style={{ padding: '12px 24px', borderRadius: '12px', background: view === 'list' ? 'var(--gradient-primary)' : 'transparent', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800, transition: '0.3s' }}>
                            <Users size={18} /> Directory
                        </button>
                        <button onClick={() => setView('add')} style={{ padding: '12px 24px', borderRadius: '12px', background: view === 'add' ? 'var(--gradient-primary)' : 'transparent', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800, transition: '0.3s' }}>
                            <UserPlus size={18} /> Provision
                        </button>
                    </div>

                    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 16px', borderRadius: '16px', border: '1px solid rgba(255,0,110,0.2)', background: 'rgba(255,0,110,0.05)' }}>
                        <select
                            value={wipeBatch}
                            onChange={(e) => setWipeBatch(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#FF006E', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                            <option value="All">ALL YEARS</option>
                        </select>
                        <button onClick={deleteAllUsers} style={{ background: 'transparent', border: 'none', color: '#FF006E', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.3s' }}>
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15vh 0', gap: '30px' }}>
                    <Loader2 className="animate-spin" size={60} color="var(--accent-magenta)" strokeWidth={1.5} />
                    <span style={{ fontWeight: 800, color: 'white', letterSpacing: '5px', textTransform: 'uppercase', opacity: 0.7 }}>Analyzing Directory</span>
                </div>
            ) : view === 'add' ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
                    gap: '40px',
                    animation: 'scaleUp 0.3s ease-out',
                    alignItems: 'start'
                }}>
                    {/* Manual Form */}
                    <div className="glass-card" style={{ padding: '40px', borderRadius: '32px', background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
                        <h3 style={{ marginBottom: '35px', fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-magenta)' }}>Manual Provisioning</h3>
                        <form onSubmit={handleAddSingle} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Access Protocol</label>
                                <select className="form-input" style={{ width: '100%', height: '56px', background: 'rgba(0,0,0,0.2)', padding: '0 20px' }} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="team">Team (Student Level)</option>
                                    <option value="admin">Administrator (Root Level)</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Username</label>
                                    <input className="form-input" style={{ width: '100%', height: '56px', background: 'rgba(0,0,0,0.2)', padding: '0 20px' }} placeholder="e.g. t27-025" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Secret Key</label>
                                    <input className="form-input" style={{ width: '100%', height: '56px', background: 'rgba(0,0,0,0.2)', padding: '0 20px' }} type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                                </div>
                            </div>

                            {newUser.role === 'team' && (
                                <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '25px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '25px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 0.4fr) 1fr', gap: '25px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Team #</label>
                                            <input className="form-input" style={{ width: '100%', height: '56px', background: 'rgba(0,0,0,0.2)', padding: '0 20px' }} type="number" placeholder="25" value={newUser.teamNumber} onChange={e => setNewUser({ ...newUser, teamNumber: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Identification Name</label>
                                            <input className="form-input" style={{ width: '100%', height: '56px', background: 'rgba(0,0,0,0.2)', padding: '0 20px' }} placeholder="e.g. Cyber Knights" value={newUser.teamName} onChange={e => setNewUser({ ...newUser, teamName: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Operating Year (Batch)</label>
                                        <input className="form-input" style={{ width: '100%', height: '56px', background: 'rgba(0,0,0,0.2)', padding: '0 20px' }} placeholder="2027" value={newUser.batch} onChange={e => setNewUser({ ...newUser, batch: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" style={{ height: '64px', marginTop: '10px', borderRadius: '18px', fontSize: '1rem', fontWeight: 900, width: '100%', boxShadow: '0 10px 30px rgba(131, 56, 236, 0.2)' }}>
                                Authorize Identity
                            </button>
                        </form>
                    </div>

                    {/* Bulk Interface */}
                    <div className="glass-card" style={{ padding: '40px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>Bulk Injection</h3>
                            <div className="badge badge-info" style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900 }}>JSON INTERFACE</div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '30px', lineHeight: 1.6 }}>Mass-inject accounts using a structured JSON matrix. Password hash is handled automatically.</p>
                        <textarea
                            className="form-input"
                            style={{
                                width: '100%',
                                height: '420px',
                                fontFamily: '"Fira Code", monospace',
                                fontSize: '0.85rem',
                                background: '#08080a',
                                color: '#00D4FF',
                                border: '1px solid rgba(0, 212, 255, 0.1)',
                                padding: '25px',
                                lineHeight: 1.6,
                                borderRadius: '20px',
                                resize: 'none',
                                boxSizing: 'border-box'
                            }}
                            placeholder={`[
  { 
    "username": "t27-025", 
    "password": "p", 
    "role": "team", 
    "teamNumber": 25,
    "teamName": "Cyber Knights",
    "batch": "2027"
  }
]`}
                            value={bulkJson}
                            onChange={e => setBulkJson(e.target.value)}
                        />
                        <button onClick={handleBulkAdd} className="btn btn-primary" style={{ width: '100%', marginTop: '30px', height: '64px', borderRadius: '18px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', fontWeight: 900 }}>
                            <Upload size={20} /> Synchronize Bulk Provisioning
                        </button>
                    </div>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ minWidth: '1100px' }}>
                        <table className="data-table">
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <th style={{ padding: '25px 35px' }}>Identity</th>
                                    <th>Security Level</th>
                                    <th>Contextual Mapping</th>
                                    <th>Active Batch</th>
                                    <th>Authorized On</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Purge</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.3s' }}>
                                        <td style={{ padding: '20px 35px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: u.role === 'admin' ? 'var(--gradient-magenta)' : 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                                    {u.username[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{u.username}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>UID: HM-{u.id.toString().padStart(4, '0')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px',
                                                fontSize: '0.7rem', fontWeight: 900,
                                                background: u.role === 'admin' ? 'rgba(255,0,110,0.1)' : 'rgba(108, 99, 255, 0.1)',
                                                color: u.role === 'admin' ? '#FF006E' : 'var(--accent-primary)',
                                                border: u.role === 'admin' ? '1px solid rgba(255,0,110,0.2)' : '1px solid rgba(108,99,255,0.2)'
                                            }}>
                                                {u.role === 'admin' ? <Shield size={12} /> : <Users size={12} />}
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                                            {u.role === 'team' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ padding: '5px 12px', background: 'rgba(0, 212, 255, 0.1)', color: '#00D4FF', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900, border: '1px solid rgba(0,212,255,0.2)' }}>T#{u.team_number}</div>
                                                    <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{u.team_name}</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontStyle: 'italic', opacity: 0.4, fontSize: '0.85rem' }}>Global Root Authority</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }}></div>
                                                {u.batch}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                                            {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={() => deleteUser(u.id, u.username)}
                                                title="Immediate Termination"
                                                style={{ background: 'rgba(255,0,110,0.05)', border: 'none', padding: '12px', borderRadius: '12px', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.3s' }}
                                                onMouseOver={e => { e.currentTarget.style.color = '#ff006e'; e.currentTarget.style.background = 'rgba(255,0,110,0.15)'; }}
                                                onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,0,110,0.05)'; }}
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {users.length === 0 && !loading && (
                <div style={{ padding: '180px 0', textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '40px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 40px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <AlertCircle size={54} color="rgba(255,255,255,0.1)" />
                    </div>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 950, color: 'rgba(255,255,255,0.15)', letterSpacing: '-1px' }}>SYSTEM DIRECTORY EMPTY</h3>
                    <p style={{ color: 'rgba(255,255,255,0.1)', fontWeight: 600, maxWidth: '400px', margin: '0 auto' }}>No authorized identities found. Initiate provision protocol to add users.</p>
                </div>
            )}
        </div>
    );
}
