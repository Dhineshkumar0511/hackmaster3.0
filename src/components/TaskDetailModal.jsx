import React, { useState } from 'react';
import { X, CheckCircle, Clock, PlayCircle, User, Flag, Tag, Layers, FileText, Users, Save, Loader2, Pencil, Eye } from 'lucide-react';

export default function TaskDetailModal({ task, onClose, teams, useCases, onUpdate, canEdit = false }) {
    if (!task) return null;

    const team = teams?.find(t => t.id === task.team_id);
    const uc = team?.use_case_id ? useCases?.find(u => u.id === team.use_case_id) : null;
    const useCaseTitle = task.use_case_title || uc?.title || null;

    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title || '');
    const [editDesc, setEditDesc] = useState(task.description || '');
    const [editStatus, setEditStatus] = useState(task.status || 'todo');
    const [editPriority, setEditPriority] = useState(task.priority || 'medium');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const hasChanges = editTitle !== (task.title || '') ||
        editDesc !== (task.description || '') ||
        editStatus !== (task.status || 'todo') ||
        editPriority !== (task.priority || 'medium');

    const handleSave = async () => {
        if (!editTitle.trim()) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editTitle,
                    description: editDesc,
                    status: editStatus,
                    priority: editPriority,
                    assigned_to: task.assigned_to || ''
                })
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
                if (onUpdate) onUpdate();
            }
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const getPriorityColor = (p) => {
        if (p === 'high') return '#FF006E';
        if (p === 'medium') return '#FFBE0B';
        return '#3A86FF';
    };

    const getPriorityLabel = (p) => {
        if (p === 'high') return 'CRITICAL';
        if (p === 'medium') return 'MEDIUM';
        return 'LOW';
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'done': return { icon: <CheckCircle size={16} />, color: '#00C49F', bg: 'rgba(0,196,159,0.12)', text: 'COMPLETED' };
            case 'progress': return { icon: <PlayCircle size={16} />, color: '#FFBE0B', bg: 'rgba(255,190,11,0.12)', text: 'IN PROGRESS' };
            default: return { icon: <Clock size={16} />, color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)', text: 'TO DO' };
        }
    };

    const currentPriority = editing ? editPriority : (task.priority || 'medium');
    const currentStatus = editing ? editStatus : (task.status || 'todo');
    const statusInfo = getStatusInfo(currentStatus);
    const priorityColor = getPriorityColor(currentPriority);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.25s ease-out'
        }} onClick={onClose}>
            <div style={{
                width: '620px', maxWidth: '95vw', maxHeight: '90vh',
                background: 'linear-gradient(145deg, rgba(22,22,35,0.98), rgba(15,15,25,0.99))',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                animation: 'scaleUp 0.3s ease-out',
                display: 'flex', flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '24px 28px 18px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: `linear-gradient(135deg, ${priorityColor}10, transparent 60%)`,
                    position: 'relative', flexShrink: 0
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: priorityColor }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                <span style={{
                                    fontSize: '0.65rem', fontWeight: 900, letterSpacing: '1px',
                                    color: 'var(--accent-cyan)', background: 'rgba(0,200,255,0.08)',
                                    padding: '3px 10px', borderRadius: '6px'
                                }}>HM-{task.id}</span>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    padding: '3px 10px', borderRadius: '6px',
                                    background: statusInfo.bg, color: statusInfo.color,
                                    fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.5px'
                                }}>
                                    {statusInfo.icon}
                                    {statusInfo.text}
                                </div>
                                {saved && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#00C49F', animation: 'fadeIn 0.3s' }}>
                                        ✓ Saved
                                    </span>
                                )}
                            </div>

                            {/* Title - View or Edit */}
                            {editing ? (
                                <input
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    style={{
                                        margin: 0, fontSize: '1.35rem', fontWeight: 800,
                                        color: 'white', letterSpacing: '-0.5px',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(131,56,236,0.4)',
                                        borderRadius: '10px', outline: 'none',
                                        width: '100%', padding: '8px 14px'
                                    }}
                                    placeholder="Task title..."
                                />
                            ) : (
                                <h2 style={{
                                    margin: 0, fontSize: '1.5rem', fontWeight: 800,
                                    color: 'white', lineHeight: 1.3, letterSpacing: '-0.5px'
                                }}>{task.title || 'Untitled Task'}</h2>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                            {/* Edit/View Toggle - student only */}
                            {canEdit && (
                                <button
                                    onClick={() => setEditing(!editing)}
                                    style={{
                                        background: editing ? 'rgba(131,56,236,0.2)' : 'rgba(255,255,255,0.06)',
                                        border: editing ? '1px solid rgba(131,56,236,0.4)' : '1px solid transparent',
                                        color: editing ? 'var(--accent-primary)' : 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    title={editing ? 'View Mode' : 'Edit Mode'}
                                >
                                    {editing ? <Eye size={16} /> : <Pencil size={16} />}
                                </button>
                            )}
                            {/* Close */}
                            <button onClick={onClose} style={{
                                background: 'rgba(255,255,255,0.06)', border: 'none',
                                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                                width: '36px', height: '36px', borderRadius: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,0,110,0.15)'; e.currentTarget.style.color = '#FF006E'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 28px 24px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Description */}
                        <div style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '14px', padding: '14px 18px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <FileText size={16} style={{ color: 'var(--accent-primary)', opacity: 0.6 }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Description
                                </span>
                            </div>
                            {editing ? (
                                <textarea
                                    value={editDesc}
                                    onChange={e => setEditDesc(e.target.value)}
                                    placeholder="Add a description — what needs to be done, notes, acceptance criteria..."
                                    style={{
                                        width: '100%', minHeight: '90px',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(131,56,236,0.3)',
                                        borderRadius: '10px', padding: '12px 14px',
                                        color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem',
                                        lineHeight: 1.6, resize: 'vertical', outline: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    fontSize: '0.9rem', lineHeight: 1.7,
                                    color: task.description ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
                                    fontStyle: task.description ? 'normal' : 'italic',
                                    fontWeight: task.description ? 600 : 400,
                                    padding: '4px 0', whiteSpace: 'pre-wrap'
                                }}>
                                    {task.description || 'No description provided'}
                                </div>
                            )}
                        </div>

                        {/* Metadata Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {/* Assignee */}
                            <InfoCard icon={<User size={16} />} label="Assignee">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {task.assigned_to && (
                                        <div style={{
                                            width: '30px', height: '30px', borderRadius: '50%',
                                            background: 'var(--gradient-primary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: 900, flexShrink: 0
                                        }}>{task.assigned_to[0].toUpperCase()}</div>
                                    )}
                                    <span style={{
                                        fontSize: '0.95rem', fontWeight: task.assigned_to ? 700 : 500,
                                        color: task.assigned_to ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                                        fontStyle: task.assigned_to ? 'normal' : 'italic'
                                    }}>{task.assigned_to || 'Unassigned'}</span>
                                </div>
                            </InfoCard>

                            {/* Team */}
                            <InfoCard icon={<Users size={16} />} label="Team">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #00C49F, #00A0E9)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 900, flexShrink: 0
                                    }}>T{task.team_number || team?.team_number || '?'}</div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                                        {task.team_name || team?.name || 'Unknown'}
                                    </span>
                                </div>
                            </InfoCard>

                            {/* Priority */}
                            <InfoCard icon={<Flag size={16} />} label="Priority">
                                {editing ? (
                                    <select
                                        value={editPriority}
                                        onChange={e => setEditPriority(e.target.value)}
                                        style={{
                                            width: '100%', padding: '8px 12px', borderRadius: '8px',
                                            background: `${priorityColor}15`, color: priorityColor,
                                            border: `1px solid ${priorityColor}30`,
                                            fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="low">LOW</option>
                                        <option value="medium">MEDIUM</option>
                                        <option value="high">CRITICAL</option>
                                    </select>
                                ) : (
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        padding: '6px 16px', borderRadius: '8px',
                                        background: `${priorityColor}12`, border: `1px solid ${priorityColor}25`
                                    }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: priorityColor, boxShadow: `0 0 8px ${priorityColor}60` }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: priorityColor }}>{getPriorityLabel(task.priority)}</span>
                                    </div>
                                )}
                            </InfoCard>

                            {/* Status */}
                            <InfoCard icon={<Layers size={16} />} label="Status">
                                {editing ? (
                                    <select
                                        value={editStatus}
                                        onChange={e => setEditStatus(e.target.value)}
                                        style={{
                                            width: '100%', padding: '8px 12px', borderRadius: '8px',
                                            background: statusInfo.bg, color: statusInfo.color,
                                            border: `1px solid ${statusInfo.color}30`,
                                            fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="todo">TO DO</option>
                                        <option value="progress">IN PROGRESS</option>
                                        <option value="done">COMPLETED</option>
                                    </select>
                                ) : (
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        padding: '6px 16px', borderRadius: '8px',
                                        background: statusInfo.bg, border: `1px solid ${statusInfo.color}25`
                                    }}>
                                        {statusInfo.icon}
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: statusInfo.color }}>{statusInfo.text}</span>
                                    </div>
                                )}
                            </InfoCard>
                        </div>

                        {/* Use Case */}
                        <InfoCard icon={<Tag size={16} />} label="Use Case">
                            <span style={{
                                fontSize: '0.95rem',
                                fontWeight: useCaseTitle ? 700 : 500,
                                color: useCaseTitle ? 'var(--accent-green)' : 'rgba(255,255,255,0.3)',
                                fontStyle: useCaseTitle ? 'normal' : 'italic'
                            }}>{useCaseTitle || 'No use case assigned'}</span>
                        </InfoCard>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 28px', borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(0,0,0,0.15)', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={12} color="rgba(255,255,255,0.2)" />
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
                            Created {task.created_at ? new Date(task.created_at).toLocaleString() : 'Unknown'}
                        </span>
                    </div>
                    {editing && (
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            style={{
                                padding: '10px 28px', borderRadius: '12px',
                                background: hasChanges ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)',
                                border: 'none', color: hasChanges ? 'white' : 'rgba(255,255,255,0.2)',
                                fontSize: '0.8rem', fontWeight: 900, cursor: hasChanges ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                transition: 'all 0.3s',
                                boxShadow: hasChanges ? '0 4px 20px rgba(131,56,236,0.3)' : 'none'
                            }}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoCard({ icon, label, children }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px', padding: '14px 18px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: 'var(--accent-primary)', opacity: 0.6 }}>{icon}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {label}
                </span>
            </div>
            {children}
        </div>
    );
}
