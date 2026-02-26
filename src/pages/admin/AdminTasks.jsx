
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../App';
import { Loader2, CheckCircle, Clock, Trash2, PlayCircle, Filter, Calendar, AlertCircle } from 'lucide-react';

export default function AdminTasks() {
    const { selectedBatch, setSelectedBatch, teams, showToast } = useAppContext();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState('all');

    useEffect(() => {
        fetchAllTasks();
    }, [selectedBatch, selectedTeam]);

    const fetchAllTasks = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hackmaster_token');
            const url = selectedTeam === 'all'
                ? `/api/tasks/all?batch=${selectedBatch}`
                : `/api/tasks?teamId=${selectedTeam}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTasks(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const deleteTask = async (id) => {
        if (!window.confirm('Globally remove this team task?')) return;
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch(`/api/tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Task deleted successfully', 'warning');
                fetchAllTasks();
            }
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    const getPriorityColor = (p) => {
        if (p === 'high') return '#FF006E';
        if (p === 'medium') return '#FFBE0B';
        return '#3A86FF';
    };

    const getStatusIcon = (status) => {
        if (status === 'done') return <CheckCircle color="#00C49F" size={20} />;
        if (status === 'progress') return <PlayCircle color="#FFBE0B" size={20} />;
        return <Clock color="rgba(255,255,255,0.3)" size={20} />;
    };

    const KanbanColumn = ({ title, status, items, accent, subtitle }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', minWidth: '380px', flex: 1 }}>
            <div style={{ padding: '0 8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: accent, boxShadow: `0 0 15px ${accent}` }}></div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>{title}</h3>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.07)', padding: '4px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800 }}>{items.length}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{subtitle}</div>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                minHeight: '650px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '24px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2)',
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 280px)'
            }}>
                {items.map(task => {
                    const team = teams.find(t => t.id === task.team_id);
                    return (
                        <div key={task.id} className="glass-card" style={{
                            padding: '20px',
                            borderLeft: `6px solid ${getPriorityColor(task.priority)}`,
                            background: 'rgba(255,255,255,0.03)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            animation: 'fadeIn 0.4s ease-out',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            borderRight: '1px solid rgba(255,255,255,0.05)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                        <div style={{
                                            padding: '3px 10px',
                                            background: 'var(--gradient-primary)',
                                            borderRadius: '8px',
                                            fontSize: '0.7rem',
                                            fontWeight: 900,
                                            color: 'white',
                                            boxShadow: '0 4px 12px rgba(131, 56, 236, 0.3)'
                                        }}>T#{task.team_number}</div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>{team?.name || 'Loading...'}</span>
                                    </div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', lineHeight: 1.4, letterSpacing: '-0.3px' }}>{task.title}</div>
                                </div>
                                <button
                                    onClick={() => deleteTask(task.id)}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px', marginLeft: '10px' }}
                                    onMouseOver={e => { e.currentTarget.style.color = '#FF006E'; e.currentTarget.style.background = 'rgba(255,0,110,0.1)'; }}
                                    onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.65rem',
                                        fontWeight: 900,
                                        color: 'var(--accent-primary)'
                                    }}>
                                        {task.assigned_to?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{task.assigned_to || 'Not Assigned'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: getPriorityColor(task.priority), background: `${getPriorityColor(task.priority)}15`, padding: '2px 8px', borderRadius: '4px' }}>{task.priority.toUpperCase()}</span>
                                    {getStatusIcon(task.status)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {items.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.2, minHeight: '300px' }}>
                        <AlertCircle size={48} strokeWidth={1} style={{ marginBottom: '20px' }} />
                        <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '1px' }}>WORKSPACE CLEAR</span>
                    </div>
                )}
            </div>
        </div>
    );

    const filteredTeams = teams.filter(t => t.batch === selectedBatch);

    return (
        <div style={{ padding: 'var(--space-2xl)', maxWidth: '1700px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            {/* Minimal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-2xl)' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '4.5rem', fontWeight: 950, letterSpacing: '-3px', lineHeight: 0.9, marginBottom: '20px' }}>Global Roadmap</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 10px currentColor' }}></div>
                            Live Monitor
                        </div>
                        <span style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }}></span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                            Track real-time progress across all teams
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Calendar size={20} color="var(--accent-primary)" />
                        <select
                            className="form-input"
                            style={{ width: '160px', border: 'none', background: 'transparent', padding: 0, height: 'auto', fontWeight: 900, fontSize: '1rem' }}
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                        >
                            <option value="2027">Batch 2027</option>
                            <option value="2028">Batch 2028</option>

                        </select>
                    </div>

                    <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Filter size={20} color="rgba(255,255,255,0.3)" />
                        <select
                            className="form-input"
                            style={{ width: '220px', border: 'none', background: 'transparent', padding: 0, height: 'auto', fontWeight: 700, fontSize: '1rem' }}
                            value={selectedTeam}
                            onChange={e => setSelectedTeam(e.target.value)}
                        >
                            <option value="all">Analyze All Teams</option>
                            {filteredTeams.map(t => (
                                <option key={t.id} value={t.id}>Team #{t.team_number} | {t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '150px 0', gap: '30px' }}>
                    <div style={{ position: 'relative' }}>
                        <Loader2 className="animate-spin" size={80} color="var(--accent-primary)" strokeWidth={1.5} />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '30px', height: '30px', background: 'var(--accent-primary)', borderRadius: '50%', opacity: 0.3, filter: 'blur(10px)' }}></div>
                    </div>
                    <span style={{ fontWeight: 800, color: 'white', letterSpacing: '5px', textTransform: 'uppercase', opacity: 0.7 }}>Synchronizing</span>
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    gap: '24px',
                    overflowX: 'auto',
                    paddingBottom: '40px',
                    paddingTop: '10px'
                }}>
                    <KanbanColumn
                        title="Backlog"
                        subtitle="Pending Implementation"
                        status="todo"
                        items={tasks.filter(t => t.status === 'todo')}
                        accent="#8338EC"
                    />
                    <KanbanColumn
                        title="In Development"
                        subtitle="Active Work"
                        status="progress"
                        items={tasks.filter(t => t.status === 'progress')}
                        accent="#FFBE0B"
                    />
                    <KanbanColumn
                        title="Completed"
                        subtitle="Deployed & Ready"
                        status="done"
                        items={tasks.filter(t => t.status === 'done')}
                        accent="#00C49F"
                    />
                </div>
            )}
        </div>
    );
}
