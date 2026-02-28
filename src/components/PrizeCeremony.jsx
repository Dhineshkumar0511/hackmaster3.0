
import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award, PartyPopper, X, Zap, Crown, Target } from 'lucide-react';

export default function PrizeCeremony({ leaderboard, onClose }) {
    const top3 = leaderboard.slice(0, 3);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const timers = [
            setTimeout(() => setStep(1), 800),  // 3rd
            setTimeout(() => setStep(2), 2500), // 2nd
            setTimeout(() => setStep(3), 4200), // 1st
            setTimeout(() => setStep(4), 6000), // Confetti/Glow
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    if (!top3.length) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#020205',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            perspective: '2000px',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Cinematic Background */}
            <div className="starfield" />
            <div className="ambient-light" />

            <button
                onClick={onClose}
                className="close-trigger"
                style={{ position: 'absolute', top: '40px', right: '40px', zIndex: 100 }}
            >
                <X size={24} />
            </button>

            {/* Top Text Layer */}
            <div className="header-layer" style={{
                opacity: step >= 1 ? 1 : 0,
                transform: `translateZ(100px) translateY(${step >= 1 ? '0' : '-50px'})`
            }}>
                <h2 className="top-title">BI-HOURLY PERFORMANCE REPORT</h2>
                <h1 className="main-title">ELITE PODIUM</h1>
            </div>

            {/* 3D World */}
            <div className="stadium-container">

                {/* 2nd Place - Silver Node */}
                <div className={`platform silver ${step >= 2 ? 'rise' : ''}`} style={{ '--h': '260px', '--color': '#C0C0C0' }}>
                    <div className="card-float">
                        <div className="rank-label">RANK 02</div>
                        <div className="team-name">{top3[1]?.name || '---'}</div>
                        <div className="score-capsule">{top3[1]?.totalScore || 0} PTS</div>
                        <div className="medal-orbit"><Award size={32} /></div>
                    </div>
                    <div className="platform-base">2</div>
                </div>

                {/* 1st Place - Gold Core */}
                <div className={`platform gold ${step >= 3 ? 'rise-major' : ''}`} style={{ '--h': '380px', '--color': '#FFD700' }}>
                    <div className="card-float">
                        <Crown className="crown-shimmer" size={60} />
                        <div className="rank-label gold-text">CHAMPION</div>
                        <div className="team-name title-gold">{top3[0]?.name || '---'}</div>
                        <div className="score-capsule gold-bg">{top3[0]?.totalScore || 0} PTS</div>
                    </div>
                    <div className="platform-base">
                        <Trophy size={80} className="trophy-core" />
                        <div className="number">1</div>
                    </div>
                    {step >= 3 && <div className="god-ray" />}
                </div>

                {/* 3rd Place - Bronze Node */}
                <div className={`platform bronze ${step >= 1 ? 'rise' : ''}`} style={{ '--h': '180px', '--color': '#CD7F32' }}>
                    <div className="card-float">
                        <div className="rank-label">RANK 03</div>
                        <div className="team-name">{top3[2]?.name || '---'}</div>
                        <div className="score-capsule">{top3[2]?.totalScore || 0} PTS</div>
                        <div className="medal-orbit"><Target size={24} /></div>
                    </div>
                    <div className="platform-base">3</div>
                </div>
            </div>

            {/* Final HUD and Controls */}
            {step >= 4 && (
                <div className="ceremony-hud">
                    <div className="congrats-line">
                        <Zap size={20} color="#00f2fe" className="pulse-anim" />
                        <span>PROTOCOL COMPLETE: TOP TIER SYNCED</span>
                    </div>
                    <button className="premium-close" onClick={onClose}>
                        DISMISS PROTOCOL
                    </button>
                    <div className="confetti-cannon" />
                </div>
            )}

            <style>{`
                .starfield {
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(white 1px, transparent 1px);
                    background-size: 50px 50px;
                    opacity: 0.1;
                    animation: drift 60s linear infinite;
                }
                .ambient-light {
                    position: absolute;
                    width: 150%;
                    height: 150%;
                    background: radial-gradient(circle at center, rgba(108, 99, 255, 0.1) 0%, transparent 60%);
                    filter: blur(100px);
                    animation: pulse-bg 4s infinite alternate;
                }
                .header-layer {
                    text-align: center;
                    position: absolute;
                    top: 10%;
                    transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
                    z-index: 50;
                }
                .top-title { letter-spacing: 12px; font-size: 0.8rem; color: #44ebff; font-weight: 900; margin-bottom: 10px; text-shadow: 0 0 10px #44ebff; }
                .main-title { font-size: 5rem; font-weight: 950; margin: 0; color: white; filter: drop-shadow(0 0 30px rgba(255,255,255,0.2)); }
                
                .stadium-container {
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    gap: 60px;
                    width: 100%;
                    margin-top: 100px;
                    transform-style: preserve-3d;
                    transform: rotateX(15deg);
                }

                .platform {
                    width: 280px;
                    height: 0;
                    background: linear-gradient(to bottom, var(--color), #050510);
                    position: relative;
                    transform-style: preserve-3d;
                    transition: height 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 20px 60px rgba(0,0,0,0.8);
                }
                .platform.rise { height: var(--h); }
                .platform.rise-major { height: var(--h); width: 340px; }

                .platform-base {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8rem;
                    font-weight: 950;
                    color: rgba(255,255,255,0.05);
                    transform: translateZ(1px);
                }

                .card-float {
                    position: absolute;
                    bottom: calc(100% + 50px);
                    width: 100%;
                    text-align: center;
                    opacity: 0;
                    transform: translateY(40px);
                    transition: all 1s ease-out;
                }
                .platform.rise .card-float, .platform.rise-major .card-float {
                    opacity: 1;
                    transform: translateY(0);
                    transition-delay: 0.5s;
                }

                .rank-label { font-size: 0.8rem; font-weight: 900; letter-spacing: 4px; color: rgba(255,255,255,0.4); margin-bottom: 8px; }
                .gold-text { color: #FFD700; text-shadow: 0 0 10px #FFD700; }
                .team-name { font-size: 1.8rem; font-weight: 950; color: white; margin-bottom: 12px; }
                .title-gold { font-size: 2.5rem; background: linear-gradient(to right, #fff, #FFD700, #fff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                
                .score-capsule {
                    display: inline-block;
                    padding: 8px 25px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 40px;
                    font-weight: 900;
                    font-size: 1.2rem;
                    color: #44ebff;
                }
                .gold-bg { background: #FFD700; color: black; border: none; box-shadow: 0 10px 30px rgba(255,215,0,0.4); }

                .crown-shimmer { margin-bottom: 10px; filter: drop-shadow(0 0 20px rgba(255,215,0,0.5)); animation: float-anim 3s infinite ease-in-out; }
                .god-ray {
                    position: absolute;
                    top: 0; left: 50%; transform: translateX(-50%);
                    width: 150px; height: 100vh;
                    background: radial-gradient(ellipse at top, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
                    pointer-events: none;
                }

                .ceremony-hud {
                    position: absolute;
                    bottom: 8%;
                    text-align: center;
                    z-index: 100;
                }
                .congrats-line { display: flex; align-items: center; justify-content: center; gap: 15px; font-weight: 900; letter-spacing: 2px; color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-bottom: 25px; }
                
                .premium-close {
                    padding: 20px 60px;
                    background: white;
                    color: black;
                    border: none;
                    font-weight: 950;
                    letter-spacing: 4px;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 0 30px rgba(255,255,255,0.2);
                    text-transform: uppercase;
                }
                .premium-close:hover { transform: scale(1.05); background: #44ebff; }

                .close-trigger { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: white; padding: 12px; border-radius: 50%; cursor: pointer; transition: all 0.3s; }
                .close-trigger:hover { background: rgba(255,0,0,0.1); border-color: #ff004c; color: #ff004c; }

                @keyframes drift { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
                @keyframes float-anim { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
                @keyframes pulse-bg { from { opacity: 0.3; } to { opacity: 0.7; } }
                .pulse-anim { animation: pulse-bg 1s infinite alternate; }
            `}</style>
        </div>
    );
}
