
import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, Trash2, User, PlayCircle, Loader2, ChevronDown, ListFilter, Layout, Trello, MoreVertical, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../App';

export default function TeamTasks() {
    const { showToast, user, teams } = useAppContext();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
    const [newTask, setNewTask] = useState({ title: '', priority: 'medium', assignedTo: '' });

    // Find current team members
    const myTeam = teams.find(t => t.team_number === user?.teamNumber);
    const teamMembers = myTeam?.members || [];

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch tasks');
            const data = await res.json();
            setTasks(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const addTask = async (e) => {
        e.preventDefault();
        if (!newTask.title.trim()) return;
        setAdding(true);
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTask)
            });

            if (res.ok) {
                showToast('🚀 Task added to roadmap!', 'success');
                setNewTask({ title: '', priority: 'medium', assignedTo: '' });
                fetchTasks();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to add task', 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        } finally {
            setAdding(false);
        }
    };

    const updateStatus = async (task, nextStatus) => {
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...task, status: nextStatus })
            });

            if (res.ok) {
                fetchTasks();
            } else {
                showToast('Failed to update status', 'error');
            }
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    const deleteTask = async (id) => {
        if (!window.confirm('Remove this task from roadmap?')) return;
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch(`/api/tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Task removed', 'info');
                fetchTasks();
            } else {
                showToast('Failed to delete task', 'error');
            }
        } catch (err) {
            showToast('Error deleting task', 'error');
        }
    };

    const getPriorityColor = (p) => {
        if (p === 'high') return '#FF006E';
        if (p === 'medium') return '#FFBE0B';
        return '#3A86FF';
    };

    const getStatusIcon = (status) => {
        if (status === 'done') return <CheckCircle color="#00C49F" size={24} />;
        if (status === 'progress') return <PlayCircle color="#FFBE0B" size={24} />;
        return <Clock color="rgba(255,255,255,0.3)" size={24} />;
    };

    const KanbanColumn = ({ title, status, items, accent }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', minWidth: '320px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent }}></div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>{title}</h3>
                </div>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{items.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', minHeight: '400px', background: 'rgba(255,255,255,0.01)', borderRadius: '15px', padding: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                {items.map(task => (
                    <div key={task.id} className="glass-card" style={{
                        padding: '16px',
                        borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                        background: 'rgba(255,255,255,0.03)',
                        transition: 'all 0.2s ease',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '8px' }}>{task.title}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 900 }}>
                                        {task.assigned_to?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.assigned_to || 'Unassigned'}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                <button
                                    onClick={() => deleteTask(task.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.1)' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#FF006E'}
                                    onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.1)'}
                                >
                                    <Trash2 size={14} />
                                </button>
                                <div style={{ position: 'relative' }}>
                                    <MoreVertical size={14} color="rgba(255,255,255,0.2)" />
                                    <select
                                        value={task.status}
                                        onChange={(e) => updateStatus(task, e.target.value)}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    >
                                        <option value="todo">Move to Ready</option>
                                        <option value="progress">Move to In Progress</option>
                                        <option value="done">Move to Completed</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: getPriorityColor(task.priority), textTransform: 'uppercase' }}>{task.priority}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {getStatusIcon(task.status)}
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{task.status}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.3 }}>
                        <AlertCircle size={30} strokeWidth={1} style={{ marginBottom: '10px' }} />
                        <span style={{ fontSize: '0.75rem' }}>Empty Column</span>
                    </div>
                )}
            </div>
        </div>
    );

    const getStatusStyle = (status) => {
        switch (status) {
            case 'done': return { bg: 'rgba(0, 245, 160, 0.1)', color: 'var(--accent-green)', text: 'DONE' };
            case 'progress': return { bg: 'rgba(255, 190, 11, 0.1)', color: 'var(--accent-orange)', text: 'IN PROGRESS' };
            default: return { bg: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', text: 'TO DO' };
        }
    };

    const TaskListView = () => {
        return (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', animation: 'scaleUp 0.4s ease-out' }}>
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.01)' }}>
                            <tr>
                                <th style={{ padding: '20px 25px', width: '40px' }}><input type="checkbox" disabled /></th>
                                <th style={{ padding: '20px 15px' }}>Task Description</th>
                                <th style={{ padding: '20px 15px' }}>Member</th>
                                <th style={{ padding: '20px 15px', width: '100px' }}>Priority</th>
                                <th style={{ padding: '20px 15px', width: '160px' }}>Status</th>
                                <th style={{ padding: '20px 25px', width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => {
                                const status = getStatusStyle(task.status);
                                return (
                                    <tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '18px 25px' }}><input type="checkbox" /></td>
                                        <td style={{ padding: '18px 15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ minWidth: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Layout size={14} color="var(--accent-primary)" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 800, marginBottom: '2px' }}>HM-{task.id}</div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 600, color: task.status === 'done' ? 'var(--text-muted)' : 'rgba(255,255,255,0.9)' }}>{task.title}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '18px 15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, color: 'white' }}>
                                                    {task.assigned_to?.[0] || '?'}
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{task.assigned_to || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '18px 15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: getPriorityColor(task.priority) }}>
                                                <div style={{ width: '12px', height: '3px', borderRadius: '2px', background: getPriorityColor(task.priority) }}></div>
                                                {task.priority.toUpperCase()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '18px 15px' }}>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: status.bg, color: status.color, borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, border: `1px solid ${status.color}22`, cursor: 'pointer' }}>
                                                {status.text}
                                                <ChevronDown size={14} style={{ opacity: 0.5 }} />
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => updateStatus(task, e.target.value)}
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                >
                                                    <option value="todo">TO DO</option>
                                                    <option value="progress">IN PROGRESS</option>
                                                    <option value="done">DONE</option>
                                                </select>
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
                    {tasks.length === 0 && (
                        <div style={{ padding: '100px 0', textAlign: 'center', opacity: 0.3 }}>
                            <AlertCircle size={48} style={{ marginBottom: '20px' }} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>NO TASKS RECORDED</h3>
                            <p style={{ fontSize: '0.85rem' }}>Your team roadmap is currently clear.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: 'var(--space-xl)', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            {/* Elegant Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-2px', marginBottom: '8px' }}>Project Roadmap</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 10px currentColor' }}></div>
                            Team #{user?.teamNumber} Dashboard
                        </div>
                        <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }}></span>
                        <div className="badge badge-info" style={{ fontSize: '0.7rem', padding: '4px 12px' }}>{tasks.length} Active Items</div>
                    </div>
                </div>

                <div className="glass-card" style={{ display: 'flex', padding: '4px', gap: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                        onClick={() => setViewMode('kanban')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            background: viewMode === 'kanban' ? 'var(--gradient-primary)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.3s'
                        }}
                    >
                        <Trello size={18} /> Board
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            background: viewMode === 'list' ? 'var(--gradient-primary)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.3s'
                        }}
                    >
                        <ListFilter size={18} /> Timeline
                    </button>
                </div>
            </div>

            {/* Quick Task Entry */}
            <div className="glass-card" style={{ padding: '25px', marginBottom: 'var(--space-2xl)', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                <form onSubmit={addTask} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                        <input
                            className="form-input"
                            style={{ height: '56px', paddingLeft: '50px', fontSize: '1rem' }}
                            placeholder="Add a new milestone or task..."
                            value={newTask.title}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            required
                        />
                        <Layout style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={20} />
                    </div>

                    <div style={{ position: 'relative', width: '220px' }}>
                        <User style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={18} />
                        <select
                            className="form-input"
                            style={{ height: '56px', paddingLeft: '45px', fontWeight: 600 }}
                            value={newTask.assignedTo}
                            onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                        >
                            <option value="">Assign Member</option>
                            {teamMembers.map((m, i) => <option key={i} value={m.name}>{m.name}</option>)}
                        </select>
                    </div>

                    <select
                        className="form-input"
                        style={{ height: '56px', width: '180px', fontWeight: 600 }}
                        value={newTask.priority}
                        onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">Critical</option>
                    </select>

                    <button type="submit" className="btn btn-primary" disabled={adding} style={{ height: '56px', padding: '0 30px', fontWeight: 900 }}>
                        {adding ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Deploy Task</>}
                    </button>
                </form>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '20px' }}>
                    <Loader2 className="animate-spin" size={60} color="var(--accent-primary)" />
                    <span style={{ fontWeight: 800, opacity: 0.5, letterSpacing: '4px' }}>LOADING DATA</span>
                </div>
            ) : viewMode === 'kanban' ? (
                <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '30px' }}>
                    <KanbanColumn title="Backlog" status="todo" items={tasks.filter(t => t.status === 'todo')} accent="rgba(255,255,255,0.2)" />
                    <KanbanColumn title="In Progress" status="progress" items={tasks.filter(t => t.status === 'progress')} accent="#FFBE0B" />
                    <KanbanColumn title="Done" status="done" items={tasks.filter(t => t.status === 'done')} accent="#00C49F" />
                </div>
            ) : (
                <TaskListView />
            )}
        </div>
    );
}
