import React from 'react';
import { TIMELINE } from '../../data/constants';

export default function TeamTimeline() {
    return (
        <div>
            <div className="page-header">
                <h2 className="gradient-text">⏰ Hackathon Timeline</h2>
                <p>Complete schedule from problem reveal to prize distribution</p>
            </div>

            <div className="glass-card section-card">
                <div className="timeline" style={{ padding: '20px 20px 20px 50px' }}>
                    {TIMELINE.map((item, idx) => (
                        <div key={idx} className={`timeline-item ${item.status}`} style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className="timeline-dot" />
                            <div style={{
                                padding: 'var(--space-lg)',
                                background: item.status === 'active'
                                    ? 'rgba(0, 212, 255, 0.08)'
                                    : item.status === 'completed'
                                        ? 'rgba(0, 245, 160, 0.05)'
                                        : 'rgba(108, 99, 255, 0.03)',
                                borderRadius: 'var(--radius-md)',
                                border: `1px solid ${item.status === 'active'
                                        ? 'rgba(0, 212, 255, 0.3)'
                                        : item.status === 'completed'
                                            ? 'rgba(0, 245, 160, 0.2)'
                                            : 'var(--border-color)'
                                    }`,
                            }}>
                                <div className="timeline-date">{item.date}</div>
                                <div className="timeline-title">
                                    {item.title}
                                    {item.status === 'active' && <span className="badge badge-info" style={{ marginLeft: '8px' }}>LIVE</span>}
                                    {item.status === 'completed' && <span className="badge badge-success" style={{ marginLeft: '8px' }}>✓ Done</span>}
                                </div>
                                <div className="timeline-desc">{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
