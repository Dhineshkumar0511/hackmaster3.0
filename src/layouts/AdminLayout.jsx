import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';

const navItems = [
    { path: '/admin', icon: '🏠', label: 'Dashboard', end: true },
    { path: '/admin/assign', icon: '🎯', label: 'Assign Use Cases' },
    { path: '/admin/teams', icon: '👥', label: 'Team Details' },
    { path: '/admin/submissions', icon: '📤', label: 'Submissions' },
    { path: '/admin/leaderboard', icon: '🏆', label: 'Leaderboard' },
    { path: '/admin/mentor-marks', icon: '✍️', label: 'Mentor Marks' },
    { path: '/admin/certificates', icon: '📜', label: 'Certificates' },
    { path: '/admin/tasks', icon: '✅', label: 'Global Roadmap' },
];

export default function AdminLayout() {
    const { user, logout, selectedBatch, setSelectedBatch } = useAppContext();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="page-container">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <h1 className="gradient-text">HACKMASTER</h1>
                    <span className="version">ADMIN</span>
                    <p className="subtitle">SMVEC AI&DS Dept<br />Control Panel</p>
                </div>


                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #FF006E, #FF8C00)' }}>A</div>
                        <div>
                            <div className="user-name">Administrator</div>
                            <div className="user-role">HackMaster Admin</div>
                        </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
                        🚪 Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
