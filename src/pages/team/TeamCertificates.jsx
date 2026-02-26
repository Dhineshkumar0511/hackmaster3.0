import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Award, Download, Star, ShieldCheck } from 'lucide-react';
import html2canvas from 'html2canvas';

const G = '#C9A84C';
const NAVY = '#0B1437';
const CREAM = '#FDF6E3';
const GGRD = 'linear-gradient(135deg,#7A5C1E,#BF953F,#FCF6BA,#B38728,#FCF6BA,#BF953F,#7A5C1E)';

function buildCertContent(cert, teamName, isTop) {
    const dt = new Date(cert.issued_at || Date.now())
        .toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const title = isTop ? 'Achievement' : 'Participation';
    const logoUrl = 'https://smvec.ac.in/wp-content/uploads/2024/05/logo.png';

    const badge = isTop ? `
        <div style="display:inline-flex;align-items:center;gap:12px;margin-top:15px;
            background:${GGRD};border-radius:40px;padding:12px 40px;
            font-family:'Segoe UI',Arial,sans-serif;font-weight:950;font-size:15px;
            color:#1a0a00;letter-spacing:5px;text-transform:uppercase;
            box-shadow:0 0 50px rgba(201,168,76,0.5), 0 10px 30px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.4);">
            &#9733;&nbsp;&nbsp;EXCELLENCE AWARD&nbsp;&nbsp;&#9733;
        </div>` : '';

    return `<div style="width:1654px;height:1169px;background:${NAVY};position:relative;
        font-family:Georgia,serif;box-sizing:border-box;overflow:hidden;">

        <!-- BG depth layers -->
        <div style="position:absolute;inset:0;background:
            radial-gradient(ellipse 40% 60% at 0% 50%,rgba(201,168,76,0.12) 0%,transparent 100%),
            radial-gradient(ellipse 40% 60% at 100% 50%,rgba(80,110,255,0.08) 0%,transparent 100%),
            radial-gradient(circle at 50% 50%, rgba(201,168,76,0.03) 0%, transparent 70%);"></div>

        <!-- Micro-pattern for texture -->
        <div style="position:absolute;inset:0;opacity:0.02;
            background-image:radial-gradient(${G} 0.5px, transparent 0.5px);
            background-size:24px 24px;"></div>

        <!-- Premium Corner Caps -->
        <div style="position:absolute;top:0;left:0;width:180px;height:180px;background:linear-gradient(135deg, ${G} 0%, transparent 70%);opacity:0.05;"></div>
        <div style="position:absolute;top:0;right:0;width:180px;height:180px;background:linear-gradient(-135deg, ${G} 0%, transparent 70%);opacity:0.05;"></div>

        <!-- Bezeled Edge border -->
        <div style="position:absolute;top:0;left:0;right:0;height:12px;background:${GGRD};box-shadow:0 3px 10px rgba(0,0,0,0.5);"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:12px;background:${GGRD};box-shadow:0 -3px 10px rgba(0,0,0,0.5);"></div>
        <div style="position:absolute;top:0;left:0;bottom:0;width:12px;background:${GGRD};box-shadow:3px 0 10px rgba(0,0,0,0.5);"></div>
        <div style="position:absolute;top:0;right:0;bottom:0;width:12px;background:${GGRD};box-shadow:-3px 0 10px rgba(0,0,0,0.5);"></div>

        <!-- Triple Line Internal Frame -->
        <div style="position:absolute;top:30px;left:30px;right:30px;bottom:30px;border:2px solid rgba(201,168,76,0.4);"></div>
        <div style="position:absolute;top:38px;left:38px;right:38px;bottom:38px;border:1px solid rgba(201,168,76,0.15);"></div>
        
        <!-- Corner Brackets -->
        <div style="position:absolute;top:20px;left:20px;width:100px;height:100px;border-top:5px solid ${G};border-left:5px solid ${G};border-radius:2px;"></div>
        <div style="position:absolute;top:20px;right:20px;width:100px;height:100px;border-top:5px solid ${G};border-right:5px solid ${G};border-radius:2px;"></div>
        <div style="position:absolute;bottom:20px;left:20px;width:100px;height:100px;border-bottom:5px solid ${G};border-left:5px solid ${G};border-radius:2px;"></div>
        <div style="position:absolute;bottom:20px;right:20px;width:100px;height:100px;border-bottom:5px solid ${G};border-right:5px solid ${G};border-radius:2px;"></div>

        <!-- Artistic Motifs in corners -->
        <div style="position:absolute;top:32px;left:32px;font-size:30px;color:${G};opacity:0.6;">✧</div>
        <div style="position:absolute;top:32px;right:32px;font-size:30px;color:${G};opacity:0.6;">✧</div>
        <div style="position:absolute;bottom:32px;left:32px;font-size:30px;color:${G};opacity:0.6;">✧</div>
        <div style="position:absolute;bottom:32px;right:32px;font-size:30px;color:${G};opacity:0.6;">✧</div>

        <!-- Large Center Watermark -->
        <div style="position:absolute;top:55%;left:50%;transform:translate(-50%,-50%);
            font-size:240px;font-weight:950;color:rgba(201,168,76,0.025);
            font-family:serif;letter-spacing:25px;white-space:nowrap;user-select:none;pointer-events:none;">SMVEC</div>

        <!-- ====== CONTENT ====== -->
        <div style="position:relative;z-index:10;
            padding:60px 120px 50px 120px;
            height:100%;box-sizing:border-box;
            display:flex;flex-direction:column;align-items:center;text-align:center;">

            <!-- HEADER WITH OFFICIAL LOGO -->
            <div style="width:100%;display:flex;flex-direction:column;align-items:center;margin-bottom:${isTop ? '20px' : '30px'};position:relative;">
                <img src="${logoUrl}" style="height:120px;margin-bottom:25px;filter:drop-shadow(0 0 20px rgba(255,255,255,0.8));" crossorigin="anonymous" />
                
                <div style="height:3px;width:100%;margin-top:-10px;background:linear-gradient(to right,transparent,${G},#FFF,${G},transparent);margin-bottom:20px;"></div>
                
                <div style="font-size:46px;font-weight:950;color:${G};
                    letter-spacing:1px;text-transform:uppercase;
                    font-family:'Times New Roman',serif;margin-bottom:10px;
                    text-shadow:0 6px 15px rgba(0,0,0,0.6), 0 0 50px rgba(201,168,76,0.4);">
                    Sri Manakula Vinayagar Engineering College
                </div>
                <div style="font-size:20px;font-weight:900;color:rgba(201,168,76,0.9);
                    letter-spacing:7px;text-transform:uppercase;
                    font-family:Arial,sans-serif;margin-bottom:15px;">
                    Department of Artificial Intelligence and Data Science
                </div>
            </div>

            <!-- CERTIFICATE TITLE -->
            <div style="width:100%;margin-bottom:${isTop ? '25px' : '35px'};">
                <div style="font-size:15px;font-weight:900;color:rgba(201,168,76,0.65);
                    letter-spacing:18px;text-transform:uppercase;
                    font-family:Arial,sans-serif;margin-bottom:18px;">
                    Academic Credential
                </div>
                
                <!-- Metallic Ribbon / Banner -->
                <div style="position:relative;width:95%;margin:0 auto;padding:${isTop ? '20px' : '30px'} 0;
                    background:${GGRD};
                    box-shadow:0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(201,168,76,0.4), inset 0 3px 3px rgba(255,255,255,0.4);">
                    
                    <div style="font-size:105px;font-weight:950;color:#0B1437;
                        font-family:'Times New Roman',serif;letter-spacing:10px;line-height:1;
                        text-shadow:0 4px 8px rgba(0,0,0,0.4), 0 -2px 1px rgba(255,255,255,0.4);">
                        ${title.toUpperCase()}
                    </div>
                </div>
            </div>

            <!-- RECIPIENT BLOCK -->
            <div style="width:100%;margin-bottom:${isTop ? '15px' : '20px'};">
                <div style="font-size:16px;font-style:italic;color:rgba(253,246,227,0.5);
                    font-family:Georgia,serif;letter-spacing:3px;margin:0 0 8px 0;">
                    This highly prestigious award is proudly presented to
                </div>
                
                <div style="font-size:78px;font-weight:950;color:${CREAM};
                    font-family:serif;letter-spacing:5px;line-height:1;
                    text-shadow:0 0 50px rgba(201,168,76,0.3), 3px 4px 0 rgba(0,0,0,0.6);
                    margin:5px 0;">
                    ${teamName}
                </div>
                
                <div style="width:550px;height:2px;margin:10px auto;
                    background:linear-gradient(to right,transparent,${G},#FFF,${G},transparent);"></div>
                
                ${badge}
            </div>

            <!-- DESCRIPTION -->
            <div style="width:100%;max-width:1100px;margin-bottom:${isTop ? '20px' : '25px'};">
                <div style="font-size:17px;color:rgba(253,246,227,0.6);
                    line-height:1.6;font-family:Georgia,serif;margin-bottom:6px;">
                    In recognition of world-class innovation, technical mastery, and exemplary 
                    collaboration displayed during the prestigious
                </div>
                <div style="font-size:32px;font-weight:950;color:${G};
                    letter-spacing:2px;font-family:serif;margin:6px 0;text-transform:uppercase;
                    text-shadow:0 3px 10px rgba(0,0,0,0.5);">
                    HackMaster 3.0 &mdash; National Level Healthcare Hackathon
                </div>
                <div style="font-size:12px;font-weight:900;letter-spacing:5px;
                    text-transform:uppercase;color:rgba(253,246,227,0.35);
                    font-family:Arial,sans-serif;">
                    SRI MANAKULA VINAYAGAR ENGINEERING COLLEGE (AUTONOMOUS), PUDUCHERRY
                </div>
            </div>

            <!-- SIGNATURE SECTION - MINIMALIST LIFTED FOOTER -->
            <div style="width:100%;margin-top:auto;display:flex;flex-direction:column;align-items:center;padding-bottom:${isTop ? '240px' : '180px'};">
                <!-- Divider -->
                <div style="width:90%;height:1.5px;background:linear-gradient(to right,transparent,${G},${G},${G},transparent);margin-bottom:40px;opacity:0.4;"></div>
                
                <div style="width:100%;display:flex;justify-content:space-between;align-items:flex-end;padding:0 90px;box-sizing:border-box;position:relative;">
                    
                    <!-- Left: Dept Head -->
                    <div style="display:flex;flex-direction:column;align-items:center;width:400px;">
                        <div style="width:100%;border-bottom:1.5px solid rgba(201,168,76,0.3);margin-bottom:12px;
                            height:50px;display:flex;align-items:center;justify-content:center;">
                            <span style="font-family:'Zapfino', cursive, serif; color:${G}; font-size:22px; font-weight:900;">Dr. J. Madhusudanan</span>
                        </div>
                        <div style="font-size:13px;font-weight:950;letter-spacing:3px;
                            color:rgba(201,168,76,0.8);text-transform:uppercase;
                            font-family:Arial,sans-serif;">Head of Department</div>
                    </div>

                    <!-- Center: Academic Records (Logo Removed) -->
                    <div style="width:300px;display:flex;flex-direction:column;align-items:center;">
                        <div style="text-align:center;padding:10px 15px;border:1px solid rgba(253,246,227,0.1);background:rgba(0,0,0,0.2);border-radius:6px;">
                            <div style="font-size:8px;color:rgba(201,168,76,0.5);font-weight:900;letter-spacing:3px;margin-bottom:4px;">HM-CERTIFICATE ID: ${cert.id}</div>
                            <div style="font-size:9px;color:${G};font-weight:700;letter-spacing:2px;font-family:serif;">VERIFIED ACADEMIC RECORD</div>
                        </div>
                        <div style="margin-top:15px;font-size:12px;color:rgba(201,168,76,0.4);font-family:serif;font-weight:700;letter-spacing:3px;">
                            ${dt.toUpperCase()}
                        </div>
                    </div>

                    <!-- Right: Principal -->
                    <div style="display:flex;flex-direction:column;align-items:center;width:400px;">
                        <div style="width:100%;border-bottom:1.5px solid rgba(201,168,76,0.3);margin-bottom:12px;
                            height:50px;display:flex;align-items:center;justify-content:center;">
                            <span style="font-family:'Zapfino', cursive, serif; color:${G}; font-size:22px; font-weight:900;">Dr. V.S.K. Venkatachalapathy</span>
                        </div>
                        <div style="font-size:13px;font-weight:950;letter-spacing:3px;
                            color:rgba(201,168,76,0.8);text-transform:uppercase;
                            font-family:Arial,sans-serif;">Director / Principal</div>
                    </div>

                </div>
            </div>
        </div>
    </div>`;
}

export default function TeamCertificates() {
    const { user, certificates, loading } = useAppContext();
    const [downloading, setDownloading] = useState(null);
    const certList = certificates || [];

    const downloadCert = async (cert) => {
        setDownloading(cert.id);
        try {
            const teamName = cert.team_name || user?.teamName || 'Team';
            const isTop = cert.type === 'top_performer';

            // Render hidden wrapper
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:1654px;height:1169px;overflow:hidden;z-index:-1;';
            wrap.innerHTML = buildCertContent(cert, teamName, isTop);
            document.body.appendChild(wrap);

            // Wait for image and fonts
            await new Promise(r => setTimeout(r, 1000));

            const canvas = await html2canvas(wrap, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#0B1437',
                width: 1654,
                height: 1169,
                logging: false,
                onclone: (clonedDoc) => {
                    // Force display of images in cloned doc
                    const imgs = clonedDoc.getElementsByTagName('img');
                    for (let img of imgs) img.style.display = 'block';
                }
            });

            document.body.removeChild(wrap);

            const link = document.createElement('a');
            link.download = `HackMaster3_${teamName.replace(/\s+/g, '_')} _Certificate.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('Download failed:', e);
            alert('Certificate generation failed. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    if (loading) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Securing your credentials...</p>
        </div>
    );

    return (
        <div style={{ padding: 'var(--space-2xl) var(--space-xl)', animation: 'fadeIn 0.6s ease-out' }}>
            <div style={{ marginBottom: 'var(--space-3xl)', maxWidth: '900px' }}>
                <h1 className="gradient-text" style={{ fontSize: '4rem', fontWeight: 950, letterSpacing: '-3px', marginBottom: '10px' }}>
                    📜 My Certificates
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 500 }}>
                    Official recognition of your innovation at HackMaster 3.0.
                    Download high-fidelity certificates with industrial-grade 3D depth.
                </p>
            </div>

            {certList.length === 0 ? (
                <div className="glass-card" style={{
                    padding: '100px 60px', textAlign: 'center', maxWidth: '600px',
                    margin: '60px auto', opacity: 0.6, border: '2px dashed rgba(255,255,255,0.1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '25px'
                }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Award size={40} color="var(--text-muted)" />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '1.5rem', fontWeight: 800 }}>No Certificates Issued</h4>
                        <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                            Evaluation results are pending. Your hard work will be recognized shortly.
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '40px', maxWidth: '1300px' }}>
                    {certList.map(cert => {
                        const isTop = cert.type === 'top_performer';
                        const accent = isTop ? '#C9A84C' : '#00E5FF';
                        const secondary = isTop ? '#7A5C1E' : '#007FFF';

                        return (
                            <div key={cert.id}
                                style={{
                                    perspective: '2000px',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                                onClick={() => downloadCert(cert)}
                            >
                                <div className="cert-3d-card"
                                    style={{
                                        position: 'relative',
                                        background: isTop
                                            ? 'linear-gradient(135deg, #1A1F35, #0B1437)'
                                            : 'linear-gradient(135deg, #151A2E, #0B1437)',
                                        borderRadius: '32px',
                                        padding: '45px',
                                        border: `1px solid rgba(255,255,255,0.08)`,
                                        boxShadow: `0 40px 80px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 0, 0, 0.4)`,
                                        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                                        transform: 'rotateX(4deg) rotateY(-10deg) translateZ(0)',
                                        transformStyle: 'preserve-3d',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1.03) translateY(-15px) translateZ(20px)';
                                        e.currentTarget.style.boxShadow = `0 60px 120px rgba(0, 0, 0, 0.9), 0 0 60px ${accent}25`;
                                        e.currentTarget.querySelector('.sweep-effect').style.transform = 'translateX(200%)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'rotateX(4deg) rotateY(-10deg) translateZ(0)';
                                        e.currentTarget.style.boxShadow = `0 40px 80px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 0, 0, 0.4)`;
                                        e.currentTarget.querySelector('.sweep-effect').style.transform = 'translateX(-200%)';
                                    }}
                                >
                                    {/* Tech Grid Background Pattern */}
                                    <div style={{
                                        position: 'absolute', inset: 0, opacity: 0.05,
                                        backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
                                        backgroundSize: '30px 30px', pointerEvents: 'none'
                                    }}></div>

                                    {/* Ray Traced Sweep Effect */}
                                    <div className="sweep-effect" style={{
                                        position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                                        transition: 'transform 0.8s ease', transform: 'skewX(-25deg)', pointerEvents: 'none'
                                    }}></div>

                                    {/* Accent Corner Glow */}
                                    <div style={{
                                        position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px',
                                        background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`, pointerEvents: 'none'
                                    }}></div>

                                    <div style={{ transform: 'translateZ(60px)', pointerEvents: 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                                            <div style={{
                                                width: '80px', height: '80px', borderRadius: '24px',
                                                background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: `1px solid rgba(255,255,255,0.05)`, boxShadow: `0 15px 35px rgba(0,0,0,0.5)`,
                                                position: 'relative', overflow: 'hidden'
                                            }}>
                                                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${accent}40, transparent)` }}></div>
                                                {isTop ? <Star size={38} color={accent} fill={accent} style={{ position: 'relative', zIndex: 1 }} /> : <Award size={38} color={accent} style={{ position: 'relative', zIndex: 1 }} />}
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{
                                                    fontSize: '0.85rem', fontWeight: 950, color: accent,
                                                    letterSpacing: '5px', textTransform: 'uppercase', marginBottom: '6px',
                                                    textShadow: `0 0 15px ${accent}40`
                                                }}>
                                                    {isTop ? 'Gold Achievement' : 'Standard Tier'}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
                                                    fontWeight: 700, letterSpacing: '2px'
                                                }}>
                                                    CR{cert.id} // SECURE
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '35px' }}>
                                            <h3 style={{
                                                fontSize: '2rem', fontWeight: 950, marginBottom: '12px', color: 'white',
                                                letterSpacing: '-1px', lineHeight: 1.1
                                            }}>
                                                {isTop ? 'Excellence in Innovation' : 'Participation Certificate'}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ height: '2px', width: '30px', background: accent }}></div>
                                                <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                                    HackMaster 3.0 &bull; 2026
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '22px 30px', borderRadius: '20px',
                                            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
                                            transition: 'all 0.3s ease', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Download size={16} color={accent} />
                                                </div>
                                                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white', letterSpacing: '0.5px' }}>
                                                    {downloading === cert.id ? 'ENCRYPTING...' : 'COLLECT PNG'}
                                                </span>
                                            </div>
                                            <ShieldCheck size={20} color="rgba(255,255,255,0.2)" />
                                        </div>
                                    </div>

                                    {/* 3D Reflection Bottom Glow */}
                                    <div style={{
                                        position: 'absolute', bottom: '-40px', left: '10%', right: '10%', height: '80px',
                                        background: accent, filter: 'blur(70px)', opacity: 0.15, zIndex: -1
                                    }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
                .cert-3d-card { transform-style: preserve-3d; }
                .cert-3d-card:hover { border-color: rgba(255,255,255,0.2) !important; }
            `}</style>
        </div>
    );
}
