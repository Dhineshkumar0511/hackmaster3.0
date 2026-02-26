import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';

const navItems = [
    { path: '/team', icon: '🏠', label: 'Home', end: true },
    { path: '/team/rules', icon: '📋', label: 'Rules & Regulations' },
    { path: '/team/timeline', icon: '⏰', label: 'Timeline' },
    { path: '/team/details', icon: '👥', label: 'Team Details' },
    { path: '/team/usecases', icon: '💡', label: 'Use Cases' },
    { path: '/team/submission', icon: '📤', label: 'My Submissions' },
    { path: '/team/leaderboard', icon: '🏆', label: 'Leaderboard' },
    { path: '/team/mentor-marks', icon: '📊', label: 'Mentor Marks' },
    { path: '/team/tasks', icon: '✅', label: 'Team Tasks' },
];

export default function TeamLayout() {
    const { user, logout } = useAppContext();
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
                    <span className="version">v3.0</span>
                    <p className="subtitle">SMVEC AI&DS Dept<br />Healthcare Hackathon 2026</p>
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
                        <div className="user-avatar">{user?.teamName?.[0] || 'T'}</div>
                        <div>
                            <div className="user-name">{user?.teamName || 'Team'}</div>
                            <div className="user-role">Team #{user?.teamNumber || '?'} • Leader</div>
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
