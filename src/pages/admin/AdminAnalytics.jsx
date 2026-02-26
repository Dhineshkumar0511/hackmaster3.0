
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, Users } from 'lucide-react';

export default function AdminAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [batch, setBatch] = useState('2027');

    useEffect(() => {
        fetchAnalytics();
    }, [batch]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hackmaster_token');
            const res = await fetch(`/api/admin/analytics?batch=${batch}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-center" style={{ color: 'white' }}>Loading Data Insights...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics. Check server connection.</div>;

    const COLORS = ['#FF006E', '#8338EC', '#3A86FF', '#FFBE0B', '#FB5607'];

    return (
        <div style={{ padding: 'var(--space-xl)', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Batch Analytics</h1>
                <select
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                    <option value="2027">3rd Year (Batch 2027)</option>
                    <option value="2028">2nd Year (Batch 2028)</option>
                </select>
            </div>

            {/* Top Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
                <div className="glass-card" style={{ padding: 'var(--space-lg)', background: 'linear-gradient(135deg, rgba(58, 134, 255, 0.1), rgba(0,0,0,0))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Avg. Total Score</span>
                        <TrendingUp size={20} color="var(--accent-cyan)" />
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '10px' }}>{Math.round(data.averages?.avgTotal || 0)}%</div>
                </div>
                <div className="glass-card" style={{ padding: 'var(--space-lg)', background: 'linear-gradient(135deg, rgba(0, 196, 159, 0.1), rgba(0,0,0,0))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Code Quality</span>
                        <CheckCircle size={20} color="var(--accent-green)" />
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '10px' }}>{Math.round(data.averages?.avgQuality || 0)}%</div>
                </div>
                <div className="glass-card" style={{ padding: 'var(--space-lg)', background: 'linear-gradient(135deg, rgba(255, 0, 110, 0.1), rgba(0,0,0,0))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Common Insight</span>
                        <AlertCircle size={20} color="var(--accent-red)" />
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '15px', color: 'var(--accent-red)' }}>
                        {data.commonMistakes?.[0]?.name || 'All Clean'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
                {/* Score Distribution */}
                <div className="glass-card" style={{ padding: 'var(--space-xl)', height: '450px' }}>
                    <h3 style={{ marginBottom: 'var(--space-lg)', fontWeight: 700 }}>Score Distribution</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={data.distribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="scoreRange" stroke="var(--text-muted)" />
                            <YAxis stroke="var(--text-muted)" />
                            <Tooltip
                                contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="count" fill="var(--accent-cyan)" radius={[6, 6, 0, 0]} barSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Common Mistakes */}
                <div className="glass-card" style={{ padding: 'var(--space-xl)', height: '450px', overflowY: 'auto' }}>
                    <h3 style={{ marginBottom: 'var(--space-lg)', fontWeight: 700 }}>AI Feedback Patterns</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                        {data.commonMistakes.length > 0 ? data.commonMistakes.slice(0, 6).map((m, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{m.count} reports</span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${(m.count / data.commonMistakes[0].count) * 100}%`,
                                        height: '100%',
                                        background: COLORS[i % COLORS.length]
                                    }} />
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
                                No analytical data available for this batch yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
