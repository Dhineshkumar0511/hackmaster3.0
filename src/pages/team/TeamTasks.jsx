
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

    return (
        <div style={{ padding: 'var(--space-xl)', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Elegant Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '8px' }}>Team Roadmap</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <Trello size={18} color="var(--accent-primary)" />
                            <span>Team #{user?.teamNumber} Dashboard</span>
                        </div>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{tasks.length} ACTIVE TASKS</span>
                    </div>
                </div>

                <div className="glass-card" style={{ display: 'flex', padding: '4px', gap: '4px', borderRadius: '12px' }}>
                    <button onClick={() => setViewMode('kanban')} className={`btn ${viewMode === 'kanban' ? 'btn-primary' : ''}`} style={{ padding: '10px 15px', minWidth: 'auto', background: viewMode === 'kanban' ? '' : 'transparent' }}>
                        <Layout size={18} /> <span style={{ marginLeft: '8px', fontSize: '0.8rem' }}>Board</span>
                    </button>
                    <button onClick={() => setViewMode('list')} className={`btn ${viewMode === 'list' ? 'btn-primary' : ''}`} style={{ padding: '10px 15px', minWidth: 'auto', background: viewMode === 'list' ? '' : 'transparent' }}>
                        <ListFilter size={18} /> <span style={{ marginLeft: '8px', fontSize: '0.8rem' }}>Timeline</span>
                    </button>
                </div>
            </div>

            {/* Quick Task Entry */}
            <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-2xl)', background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <form onSubmit={addTask} style={{ display: 'grid', gridTemplateColumns: '1fr 220px 180px 140px', gap: '15px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="form-input"
                            style={{ paddingLeft: '45px' }}
                            placeholder="What needs to be done? (e.g. Optimize SQL queries)"
                            value={newTask.title}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            required
                        />
                        <Layout style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={18} />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={16} />
                        <select
                            className="form-input"
                            style={{ paddingLeft: '35px' }}
                            value={newTask.assignedTo}
                            onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                        >
                            <option value="">Select Assignee</option>
                            {teamMembers.map((m, i) => <option key={i} value={m.name}>{m.name}</option>)}
                        </select>
                    </div>

                    <select
                        className="form-input"
                        value={newTask.priority}
                        onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">Critical Priority</option>
                    </select>

                    <button type="submit" className="btn btn-primary" disabled={adding} style={{ height: '48px', boxShadow: '0 4px 15px rgba(108, 99, 255, 0.4)' }}>
                        {adding ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Add</>}
                    </button>
                </form>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={60} color="var(--accent-primary)" /></div>
            ) : viewMode === 'kanban' ? (
                <div style={{ display: 'flex', gap: 'var(--space-xl)', overflowX: 'auto', paddingBottom: '20px' }}>
                    <KanbanColumn title="Ready" status="todo" items={tasks.filter(t => t.status === 'todo')} accent="rgba(255,255,255,0.2)" />
                    <KanbanColumn title="In Progress" status="progress" items={tasks.filter(t => t.status === 'progress')} accent="#FFBE0B" />
                    <KanbanColumn title="Done & Verified" status="done" items={tasks.filter(t => t.status === 'done')} accent="#00C49F" />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {tasks.map(task => (
                        <div key={task.id} className="glass-card" style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `5px solid ${getPriorityColor(task.priority)}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                {getStatusIcon(task.status)}
                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: task.status === 'done' ? 'var(--text-muted)' : 'white' }}>{task.title}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>{task.assigned_to?.[0] || '?'}</div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{task.assigned_to || 'Unassigned'}</span>
                                </div>
                                <span className="badge" style={{ background: `${getPriorityColor(task.priority)}22`, color: getPriorityColor(task.priority), border: `1px solid ${getPriorityColor(task.priority)}44`, fontSize: '0.65rem' }}>{task.priority.toUpperCase()}</span>
                                <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.1)' }}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                    {tasks.length === 0 && <div style={{ textAlign: 'center', padding: '100px', opacity: 0.3 }}>No roadmap items found.</div>}
                </div>
            )}
        </div>
    );
}
