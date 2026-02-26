
import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Award, Printer, Download, ShieldCheck } from 'lucide-react';

export default function TeamCertificates() {
    const { user, certificates, loading } = useAppContext();
    const [selectedCert, setSelectedCert] = useState(null);

    const certList = certificates || [];

    if (loading) return (
        <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>⏳</div>
            <p style={{ color: 'var(--text-muted)' }}>Loading credentials...</p>
        </div>
    );

    return (
        <div style={{ padding: 'var(--space-xl)', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h1 className="gradient-text" style={{ fontSize: '3.5rem', fontWeight: 950, letterSpacing: '-2px' }}>📜 Credentials</h1>
                <p style={{ color: 'var(--text-muted)' }}>View and print your official HackMaster participation & achievement records.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: certList.length > 0 ? '1fr 1fr' : '1fr', gap: 'var(--space-2xl)' }}>
                {/* Available Certificates List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px' }}>Available Records</h3>

                    {certList.length === 0 && (
                        <div className="glass-card" style={{ padding: '50px', textAlign: 'center', opacity: 0.5 }}>
                            <Award size={48} style={{ marginBottom: '15px' }} />
                            <h4 style={{ margin: '0 0 10px 0' }}>No certificates issued yet</h4>
                            <p style={{ fontSize: '0.85rem' }}>Check back after evaluations or milestone reviews!</p>
                        </div>
                    )}

                    {certList.map(cert => (
                        <div
                            key={cert.id}
                            className="glass-card"
                            style={{
                                padding: '25px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                borderLeft: selectedCert?.id === cert.id ? '6px solid var(--primary)' : '6px solid rgba(255,255,255,0.1)',
                                background: selectedCert?.id === cert.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'
                            }}
                            onClick={() => setSelectedCert(cert)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{
                                        color: cert.type === 'top_performer' ? '#FFBE0B' : 'var(--accent-cyan)',
                                        fontWeight: 900, fontSize: '0.8rem', letterSpacing: '2px', marginBottom: '5px'
                                    }}>
                                        {(cert.type || '').toUpperCase().replace('_', ' ')}
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Certificate #{cert.id}</h4>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                        Issued on {new Date(cert.issued_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <Award size={32} color={cert.type === 'top_performer' ? '#FFBE0B' : 'white'} opacity={0.5} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Certificate Preview */}
                {certList.length > 0 && (
                    <div style={{ position: 'sticky', top: '20px' }}>
                        {selectedCert ? (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <div id="cert-preview" className="glass-card" style={{
                                    width: '100%',
                                    aspectRatio: '1.414 / 1',
                                    position: 'relative',
                                    background: 'white',
                                    color: '#1a1a1a',
                                    overflow: 'hidden',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                    border: '15px solid #1a1a1a',
                                }}>
                                    <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', bottom: '10px', border: '2px solid #ddd' }}></div>

                                    <div style={{ padding: '40px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#FF006E', letterSpacing: '3px' }}>SMVEC AI & DS DEPT</div>
                                            <h2 style={{ fontSize: '2.2rem', fontWeight: 950, margin: '15px 0 8px 0', fontFamily: 'serif' }}>
                                                Certificate of {selectedCert.type === 'top_performer' ? 'Achievement' : 'Participation'}
                                            </h2>
                                            <p style={{ fontStyle: 'italic', fontSize: '1rem', color: '#666' }}>This award is presented to</p>
                                        </div>

                                        <div>
                                            <h1 style={{ fontSize: '2.5rem', fontWeight: 950, margin: '10px 0', borderBottom: '2px solid #1a1a1a', display: 'inline-block', padding: '0 30px' }}>
                                                {selectedCert.team_name || user?.teamName || 'Team'}
                                            </h1>
                                            <p style={{ margin: '12px 0', fontSize: '0.95rem', color: '#444' }}>
                                                For outstanding performance in<br />
                                                <strong>HACKMASTER 3.0 — Healthcare Hackathon</strong><br />
                                                held at SMVEC Campus.
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: '15px' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ borderBottom: '1px solid #1a1a1a', width: '130px', margin: '0 auto 5px auto', fontSize: '0.75rem' }}>HM-{selectedCert.id}</div>
                                                <div style={{ fontWeight: 800, fontSize: '0.65rem' }}>DEPT HEAD</div>
                                            </div>
                                            <ShieldCheck size={36} color="#FF006E" />
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ borderBottom: '1px solid #1a1a1a', width: '130px', margin: '0 auto 5px auto', fontWeight: 800, fontSize: '0.75rem' }}>{new Date().toLocaleDateString()}</div>
                                                <div style={{ fontWeight: 800, fontSize: '0.65rem' }}>DATE</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
                                        <Printer size={18} /> Print Certificate
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card" style={{
                                height: '350px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.3,
                                border: '2px dashed rgba(255,255,255,0.1)'
                            }}>
                                <Printer size={48} style={{ marginBottom: '20px' }} />
                                <p>Select a record to preview</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #cert-preview, #cert-preview * { visibility: visible; }
                    #cert-preview { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; border: none !important; }
                }
            `}</style>
        </div>
    );
}
