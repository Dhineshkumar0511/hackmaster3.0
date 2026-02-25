import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';

export default function TeamDetails() {
    const { user, teams, updateTeamDetails, showToast } = useAppContext();
    const myTeam = teams.find(t => t.team_number === user?.teamNumber);

    const hasSavedData = myTeam?.members?.length > 0 && myTeam.members.some(m => m.name);
    const [isEditing, setIsEditing] = useState(!hasSavedData);

    const [formData, setFormData] = useState({
        members: [
            { name: '', regNo: '', email: '', phone: '', role: 'Leader' },
            { name: '', regNo: '', email: '', phone: '', role: 'Member' },
            { name: '', regNo: '', email: '', phone: '', role: 'Member' },
            { name: '', regNo: '', email: '', phone: '', role: 'Member' },
        ],
        mentor: { name: '', email: '', phone: '', department: '' },
    });

    // Update form when team data loads
    useEffect(() => {
        if (myTeam) {
            if (myTeam.members?.length > 0 && myTeam.members.some(m => m.name)) {
                const members = [...myTeam.members];
                while (members.length < 4) {
                    members.push({ name: '', regNo: '', email: '', phone: '', role: 'Member' });
                }
                setFormData({
                    members,
                    mentor: myTeam.mentor?.name ? myTeam.mentor : { name: '', email: '', phone: '', department: '' },
                });
                setIsEditing(false);
            }
        }
    }, [myTeam?.id]);

    const handleMemberChange = (idx, field, value) => {
        setFormData(prev => {
            const members = [...prev.members];
            members[idx] = { ...members[idx], [field]: value };
            return { ...prev, members };
        });
    };

    const handleMentorChange = (field, value) => {
        setFormData(prev => ({ ...prev, mentor: { ...prev.mentor, [field]: value } }));
    };

    const handleSave = async () => {
        if (!myTeam) return;

        // Validate at least the leader has a name
        if (!formData.members[0]?.name?.trim()) {
            showToast('Please enter at least the Team Leader name', 'error');
            return;
        }

        await updateTeamDetails(myTeam.id, {
            members: formData.members.filter(m => m.name?.trim()),
            mentor: formData.mentor,
        });
        setIsEditing(false);
    };

    const displayMembers = hasSavedData ? myTeam.members : formData.members;
    const displayMentor = hasSavedData && myTeam?.mentor?.name ? myTeam.mentor : null;

    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">👥 Team & Mentor Details</h2>
                <p>{hasSavedData ? 'Your team details are saved. Click Edit to modify.' : 'Please fill in your team details below.'}</p>
            </div>

            <div className="glass-card section-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                    <h3>👥 Team Members</h3>
                    {hasSavedData && !isEditing && (
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                            // Load current saved data into form
                            const members = [...(myTeam.members || [])];
                            while (members.length < 4) {
                                members.push({ name: '', regNo: '', email: '', phone: '', role: 'Member' });
                            }
                            setFormData({
                                members,
                                mentor: myTeam.mentor?.name ? myTeam.mentor : formData.mentor,
                            });
                            setIsEditing(true);
                        }}>✏️ Edit</button>
                    )}
                </div>

                {hasSavedData && !isEditing ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                        {displayMembers.map((member, idx) => (
                            <div key={idx} className="glass-card team-member-card">
                                <div className="member-avatar" style={{ background: member.role === 'Leader' ? 'linear-gradient(135deg, #FFD700, #FF8C00)' : 'var(--gradient-primary)' }}>
                                    {member.name?.[0] || '?'}
                                </div>
                                <div className="member-info">
                                    <h4>{member.name || 'Not Set'}</h4>
                                    <p>{member.regNo} • {member.role}</p>
                                    <p>{member.email}</p>
                                    <p>{member.phone}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                        {formData.members.map((member, idx) => (
                            <div key={idx} style={{ padding: 'var(--space-lg)', background: 'rgba(108, 99, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <div style={{ marginBottom: 'var(--space-md)' }}>
                                    <span className={`badge ${idx === 0 ? 'badge-warning' : 'badge-primary'}`}>{idx === 0 ? '👑 Leader' : `Member ${idx}`}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                                    <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" placeholder="Name" value={member.name} onChange={e => handleMemberChange(idx, 'name', e.target.value)} /></div>
                                    <div className="form-group"><label className="form-label">Reg No</label><input className="form-input" placeholder="Reg Number" value={member.regNo} onChange={e => handleMemberChange(idx, 'regNo', e.target.value)} /></div>
                                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="Email" value={member.email} onChange={e => handleMemberChange(idx, 'email', e.target.value)} /></div>
                                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="Phone" value={member.phone} onChange={e => handleMemberChange(idx, 'phone', e.target.value)} /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-card section-card">
                <h3>🎓 Mentor Details</h3>
                {hasSavedData && !isEditing ? (
                    displayMentor ? (
                        <div className="glass-card team-member-card" style={{ maxWidth: '400px' }}>
                            <div className="member-avatar" style={{ background: 'linear-gradient(135deg, #00F5A0, #00D9F5)' }}>{displayMentor.name[0]}</div>
                            <div className="member-info">
                                <h4>{displayMentor.name}</h4>
                                <p>{displayMentor.department}</p>
                                <p>{displayMentor.email}</p>
                                <p>{displayMentor.phone}</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: 'var(--space-md)' }}>
                            No mentor details provided. Click Edit to add.
                        </div>
                    )
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                        <div className="form-group"><label className="form-label">Mentor Name</label><input className="form-input" placeholder="Prof. Name" value={formData.mentor.name} onChange={e => handleMentorChange('name', e.target.value)} /></div>
                        <div className="form-group"><label className="form-label">Department</label><input className="form-input" placeholder="AI & Data Science" value={formData.mentor.department} onChange={e => handleMentorChange('department', e.target.value)} /></div>
                        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="mentor@smvec.ac.in" value={formData.mentor.email} onChange={e => handleMentorChange('email', e.target.value)} /></div>
                        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+91 XXXXX XXXXX" value={formData.mentor.phone} onChange={e => handleMentorChange('phone', e.target.value)} /></div>
                    </div>
                )}

                {(isEditing || !hasSavedData) && (
                    <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)' }}>
                        <button className="btn btn-primary" onClick={handleSave}>💾 {hasSavedData ? 'Update Details' : 'Save Details'}</button>
                        {isEditing && hasSavedData && <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>}
                    </div>
                )}
            </div>
        </div>
    );
}
