
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../App';
import { Loader2, CheckCircle, Clock, Trash2, PlayCircle, Filter, Calendar, AlertCircle, ChevronDown, Trello, ListFilter, Layout } from 'lucide-react';

export default function AdminTasks() {
    const { selectedBatch, setSelectedBatch, teams, showToast } = useAppContext();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState('all');

    const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'

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
            if (res.ok && Array.isArray(data)) {
                setTasks(data);
            } else {
                setTasks([]);
            }
        } catch (err) {
            console.error(err);
            setTasks([]);
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

    const getStatusStyle = (status) => {
        switch (status) {
            case 'done': return { bg: 'rgba(0, 245, 160, 0.1)', color: 'var(--accent-green)', text: 'DONE' };
            case 'progress': return { bg: 'rgba(255, 190, 11, 0.1)', color: 'var(--accent-orange)', text: 'IN PROGRESS' };
            default: return { bg: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', text: 'TO DO' };
        }
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {task.status === 'done' ? <CheckCircle color="#00C49F" size={20} /> : task.status === 'progress' ? <PlayCircle color="#FFBE0B" size={20} /> : <Clock color="rgba(255,255,255,0.3)" size={20} />}
                                    </div>
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

    const TaskListView = () => {
        const groupedTasks = useMemo(() => {
            const groups = {};
            tasks.forEach(task => {
                const team = teams.find(t => t.id === task.team_id);
                const groupKey = team ? `Team #${team.team_number} | ${team.name}` : 'Unknown Team';
                if (!groups[groupKey]) groups[groupKey] = [];
                groups[groupKey].push(task);
            });
            return groups;
        }, [tasks, teams]);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {Object.entries(groupedTasks).map(([groupName, teamTasks]) => (
                    // ... existing team task group rendering ...
                    <div key={groupName} className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ padding: '15px 25px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '8px', height: '20px', borderRadius: '4px', background: 'var(--gradient-primary)' }}></div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '0.5px' }}>{groupName}</h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px' }}>{teamTasks.length} tasks</span>
                            </div>
                        </div>
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <tr>
                                        <th style={{ padding: '15px 25px', width: '40px' }}><input type="checkbox" disabled /></th>
                                        <th style={{ padding: '15px 15px' }}>Work</th>
                                        <th style={{ padding: '15px 15px' }}>Assignee</th>
                                        <th style={{ padding: '15px 15px' }}>Reporter</th>
                                        <th style={{ padding: '15px 15px', width: '100px' }}>Priority</th>
                                        <th style={{ padding: '15px 15px', width: '160px' }}>Status</th>
                                        <th style={{ padding: '15px 25px', width: '60px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamTasks.map(task => {
                                        const status = getStatusStyle(task.status);
                                        const team = teams.find(t => t.id === task.team_id);
                                        const mentor = team?.mentor || {};
                                        return (
                                            <tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '18px 25px' }}><input type="checkbox" /></td>
                                                <td style={{ padding: '18px 15px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ minWidth: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Layout size={14} color="var(--accent-primary)" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 800, marginBottom: '2px' }}>HM-{task.id}</div>
                                                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{task.title}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '18px 15px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                                                            {task.assigned_to?.[0] || '?'}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem' }}>{task.assigned_to || 'Unassigned'}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '18px 15px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0, 245, 160, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent-green)' }}>
                                                            {mentor.name?.[0] || 'A'}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem' }}>{mentor.name || 'Admin'}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '18px 15px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: getPriorityColor(task.priority) }}>
                                                        <div style={{ width: '12px', height: '3px', borderRadius: '2px', background: getPriorityColor(task.priority) }}></div>
                                                        {task.priority.toUpperCase()}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '18px 15px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', background: status.bg, color: status.color, borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px', border: `1px solid ${status.color}22` }}>
                                                        {status.text}
                                                        <ChevronDown size={14} style={{ opacity: 0.5 }} />
                                                    </div>
                                                </td>
                                                <td style={{ padding: '18px 25px' }}>
                                                    <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.1)' }} onMouseOver={e => e.currentTarget.style.color = '#FF006E'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.1)'}><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div style={{ padding: '100px 0', textAlign: 'center', opacity: 0.3 }}>
                        <AlertCircle size={48} style={{ marginBottom: '20px' }} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>NO TASKS RECORDED</h3>
                        <p style={{ fontSize: '0.85rem' }}>The roadmap is currently clear for this selection.</p>
                    </div>
                )}
            </div>
        );
    };

    const filteredTeams = teams.filter(t => t.batch === selectedBatch);

    return (
        <div style={{ padding: 'var(--space-xl)', maxWidth: '1700px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            {/* Elegant Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '10px' }}>Global Roadmap</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 10px currentColor' }}></div>
                            Live Monitor
                        </div>
                        <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }}></span>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Real-time tracking
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Premium Batch Selection */}
                    <div className="glass-card" style={{ display: 'flex', padding: '4px', gap: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <button
                            onClick={() => setSelectedBatch('2027')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                background: selectedBatch === '2027' ? 'var(--gradient-primary)' : 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.3s'
                            }}
                        >
                            🎓 3rd Year — 2027
                        </button>
                        <button
                            onClick={() => setSelectedBatch('2028')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                background: selectedBatch === '2028' ? 'var(--gradient-primary)' : 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.3s'
                            }}
                        >
                            🎓 2nd Year — 2028
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* View Toggle */}
                        <div className="glass-card" style={{ display: 'flex', padding: '4px', gap: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button onClick={() => setViewMode('board')} style={{ width: '40px', height: '40px', borderRadius: '8px', background: viewMode === 'board' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Trello size={18} />
                            </button>
                            <button onClick={() => setViewMode('list')} style={{ width: '40px', height: '40px', borderRadius: '8px', background: viewMode === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <ListFilter size={18} />
                            </button>
                        </div>

                        {/* Team Filter */}
                        <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Filter size={16} color="rgba(255,255,255,0.3)" />
                            <select
                                className="form-input"
                                style={{ width: '160px', border: 'none', background: 'transparent', padding: 0, height: 'auto', fontWeight: 700, fontSize: '0.85rem' }}
                                value={selectedTeam}
                                onChange={e => setSelectedTeam(e.target.value)}
                            >
                                <option value="all">All Teams</option>
                                {filteredTeams.map(t => (
                                    <option key={t.id} value={t.id}>T#{t.team_number} | {t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '150px 0', gap: '30px' }}>
                    <div style={{ position: 'relative' }}>
                        <Loader2 className="animate-spin" size={60} color="var(--accent-primary)" strokeWidth={1.5} />
                    </div>
                    <span style={{ fontWeight: 800, color: 'white', letterSpacing: '5px', textTransform: 'uppercase', opacity: 0.7 }}>Synchronizing</span>
                </div>
            ) : viewMode === 'board' ? (
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
            ) : (
                <TaskListView />
            )}
        </div>
    );
}
