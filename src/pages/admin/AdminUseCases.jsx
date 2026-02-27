
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';

export default function AdminUseCases() {
    const { useCases, addUseCase, bulkAddUseCases, deleteUseCase, deleteAllUseCases, selectedBatch, setSelectedBatch } = useAppContext();
    const [showBulk, setShowBulk] = useState(false);
    const [bulkJson, setBulkJson] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        difficulty: 'Medium',
        tech: '',
        objective: '',
        domainChallenge: '',
        requirements: Array(10).fill(''),
        batch: selectedBatch
    });

    const batches = [
        { id: '2027', label: '3rd Year — Batch 2027' },
        { id: '2028', label: '2nd Year — Batch 2028' },
    ];

    // Sync batch when selectedBatch changes globally
    useEffect(() => {
        setFormData(prev => ({ ...prev, batch: selectedBatch }));
    }, [selectedBatch]);

    const handleReqChange = (index, value) => {
        const newReqs = [...formData.requirements];
        newReqs[index] = value;
        setFormData({ ...formData, requirements: newReqs });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanedReqs = formData.requirements.filter(r => r.trim() !== '');
        if (cleanedReqs.length < 1) {
            alert('Please add at least one requirement');
            return;
        }
        await addUseCase({ ...formData, requirements: cleanedReqs });
        setFormData({
            title: '',
            difficulty: 'Medium',
            tech: '',
            objective: '',
            domainChallenge: '',
            requirements: Array(10).fill(''),
            batch: selectedBatch
        });
    };

    const handleBulkSubmit = async () => {
        try {
            const parsed = JSON.parse(bulkJson);
            if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array');

            const formatted = parsed.map(uc => {
                // Support multiple naming variations for domainChallenge
                const challenge = uc.domainChallenge || uc.domain_challenge || uc.challenge || uc.domainChallengePart || '';
                return {
                    ...uc,
                    domainChallenge: challenge,
                    batch: selectedBatch,
                    requirements: Array.isArray(uc.requirements) ? uc.requirements : []
                };
            });

            if (window.confirm(`Import ${formatted.length} use cases to Batch ${selectedBatch}?`)) {
                await bulkAddUseCases(formatted);
                setBulkJson('');
                setShowBulk(false);
            }
        } catch (err) {
            alert('Invalid JSON format: ' + err.message);
        }
    };

    return (
        <div className="admin-use-cases">
            <div className="page-header">
                <h2 className="gradient-text">📝 Manage Problem Statements</h2>
                <p>Create and curate the use case bank for the hackathon</p>
            </div>

            {/* Batch Selector */}
            <div className="glass-card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🎓 Select Batch:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {batches.map(b => (
                        <button
                            key={b.id}
                            onClick={() => setSelectedBatch(b.id)}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '10px',
                                border: selectedBatch === b.id ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                                background: selectedBatch === b.id ? 'linear-gradient(135deg, var(--primary), var(--accent-cyan))' : 'rgba(255,255,255,0.05)',
                                color: selectedBatch === b.id ? '#fff' : 'var(--text-secondary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {b.label}
                        </button>
                    ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    Currently editing {useCases.length} use cases for {selectedBatch === '2027' ? '3rd Year' : '2nd Year'}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-xl)', alignItems: 'start', marginTop: 'var(--space-xl)' }}>
                {/* Add Form */}
                <div className="glass-card section-card" style={{ padding: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', background: 'var(--gradient-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>✨</div>
                            <h3 style={{ margin: 0 }}>Add New Use Case</h3>
                        </div>
                        <button
                            className={`btn ${showBulk ? 'btn-secondary' : 'btn-outline'}`}
                            onClick={() => setShowBulk(!showBulk)}
                            style={{ fontSize: '0.8rem', padding: '6px 16px' }}
                        >
                            {showBulk ? '↩️ Single Entry' : '📂 Bulk Import (JSON)'}
                        </button>
                    </div>

                    {showBulk ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div style={{ padding: '15px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 212, 255, 0.2)', marginBottom: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>📖 Bulk Import Instructions</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                    Paste a JSON array of objects. Each object should have:
                                    <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px', marginLeft: '5px' }}>
                                        title, objective, difficulty, tech, requirements[]
                                    </code>
                                </p>
                            </div>
                            <textarea
                                className="form-input"
                                value={bulkJson}
                                onChange={e => setBulkJson(e.target.value)}
                                placeholder='[
  {
    "title": "AI Project Name",
    "difficulty": "Medium",
    "tech": "React, Python",
    "objective": "Summarize objective here...",
    "requirements": ["Req 1", "Req 2"]
  }
]'
                                rows="15"
                                style={{ fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleBulkSubmit}
                                style={{ padding: '15px' }}
                                disabled={!bulkJson.trim()}
                            >
                                🚀 Process Bulk Import
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                            {/* Title Section */}
                            <div className="form-group">
                                <label className="form-label">Problem Statement / Title</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., AI-Driven Inventory Optimizer"
                                    required
                                    style={{ fontSize: '1.1rem', padding: '15px' }}
                                />
                            </div>

                            {/* Metadata Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Difficulty Level</label>
                                    <select className="form-input" value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value })}>
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                        <option>Medium-Hard</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tech Stack / Focus</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={formData.tech}
                                        onChange={e => setFormData({ ...formData, tech: e.target.value })}
                                        placeholder="e.g., RAG, MCP, Python"
                                    />
                                </div>
                            </div>

                            {/* Objective & Challenge */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Objective</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.objective}
                                        onChange={e => setFormData({ ...formData, objective: e.target.value })}
                                        placeholder="Main goal of this project..."
                                        rows="4"
                                        style={{ resize: 'none' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Domain Challenge</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.domainChallenge}
                                        onChange={e => setFormData({ ...formData, domainChallenge: e.target.value })}
                                        placeholder="Specific technical/domain hurdle..."
                                        rows="4"
                                        style={{ resize: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* Requirements Grid */}
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    📌 Key Requirements (List of 10)
                                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>Fill at least one</span>
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    padding: '15px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    {formData.requirements.map((req, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.5, minWidth: '20px' }}>#{i + 1}</span>
                                            <input
                                                className="form-input"
                                                type="text"
                                                value={req}
                                                onChange={e => handleReqChange(i, e.target.value)}
                                                placeholder={`Req ${i + 1}...`}
                                                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1rem' }}>
                                🚀 Publish Use Case
                            </button>
                        </form>
                    )}
                </div>

                {/* List of Use Cases */}
                <div className="glass-card section-card" style={{ padding: 'var(--space-xl)', background: 'rgba(10, 10, 20, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <h3 style={{ margin: 0 }}>Existing ({useCases.length})</h3>
                            {useCases.length > 0 && (
                                <button
                                    onClick={() => { if (window.confirm(`PERMANENTLY DELETE ALL ${useCases.length} use cases for batch ${selectedBatch}?`)) deleteAllUseCases(selectedBatch) }}
                                    style={{ background: 'rgba(255, 61, 113, 0.1)', color: '#FF3D71', border: '1px solid rgba(255, 61, 113, 0.2)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                    className="hover-scale"
                                >
                                    🗑️ DELETE ALL {selectedBatch}
                                </button>
                            )}
                        </div>
                        <span className="badge badge-info">{selectedBatch}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxHeight: '720px', overflowY: 'auto', paddingRight: '12px' }}>
                        {useCases.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
                                <p>No use cases added yet.</p>
                            </div>
                        ) : (
                            useCases.map((uc, index) => (
                                <div key={uc.id} className="glass-card usecase-item" style={{
                                    padding: 'var(--space-md)',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    transition: 'transform 0.2s ease'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '28px', height: '28px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                                {index + 1}
                                            </span>
                                            <span className={`badge ${uc.difficulty.toLowerCase().includes('high') ? 'badge-error' : uc.difficulty.toLowerCase().includes('medium') ? 'badge-warning' : 'badge-success'}`}>
                                                {uc.difficulty}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => { if (window.confirm('Delete this use case?')) deleteUseCase(uc.id) }}
                                            style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                                            className="hover-scale"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: 'var(--primary-light)' }}>{uc.title}</h4>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>🔧 {uc.tech}</span>
                                        <span style={{ fontSize: '0.7rem', background: 'rgba(0, 212, 255, 0.1)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px' }}>📋 {uc.requirements.length} Reqs</span>
                                    </div>
                                    {uc.domainChallenge && (
                                        <div style={{ marginTop: '5px', padding: '8px', background: 'rgba(108, 99, 255, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--accent-magenta)' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-magenta)', textTransform: 'uppercase', marginBottom: '2px' }}>Domain Challenge</div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{uc.domainChallenge}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

