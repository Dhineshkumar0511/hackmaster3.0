import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import TeamLayout from './layouts/TeamLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import LoginPage from './pages/LoginPage';
import TeamHome from './pages/team/TeamHome';
import TeamRules from './pages/team/TeamRules';
import TeamTimeline from './pages/team/TeamTimeline';
import TeamDetails from './pages/team/TeamDetails';
import TeamUseCases from './pages/team/TeamUseCases';
import TeamSubmission from './pages/team/TeamSubmission';
import TeamLeaderboard from './pages/team/TeamLeaderboard';
import TeamMentorMarks from './pages/team/TeamMentorMarks';
import AdminHome from './pages/admin/AdminHome';
import AdminUseCaseAssign from './pages/admin/AdminUseCaseAssign';
import AdminTeamDetails from './pages/admin/AdminTeamDetails';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminLeaderboard from './pages/admin/AdminLeaderboard';
import AdminMentorMarks from './pages/admin/AdminMentorMarks';

// Data
import { USE_CASES, HACKATHON_INFO } from './data/constants';

// ==========================================
// API Helper
// ==========================================
const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('hackmaster_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (res.status === 401) {
        localStorage.removeItem('hackmaster_token');
        localStorage.removeItem('hackmaster_user');
        window.location.href = '/';
        throw new Error('Session expired');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
}

// ==========================================
// Context
// ==========================================
const AppContext = createContext(null);
export const useAppContext = () => useContext(AppContext);

// ==========================================
// App Component
// ==========================================
function App() {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('hackmaster_user'));
        } catch {
            return null;
        }
    });

    const [teams, setTeams] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [evaluationResults, setEvaluationResults] = useState({});
    const [mentorMarks, setMentorMarks] = useState({});
    const [unlockedRequirements, setUnlockedRequirementsState] = useState(5);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);

    // ---- Toast ----
    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // ---- Auth ----
    const login = async (username, password) => {
        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });

            localStorage.setItem('hackmaster_token', data.token);
            localStorage.setItem('hackmaster_user', JSON.stringify(data.user));
            setUser(data.user);
            showToast(`Welcome, ${data.user.teamName || data.user.username}!`, 'success');
            return data.user;
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('hackmaster_token');
        localStorage.removeItem('hackmaster_user');
        setUser(null);
        setTeams([]);
        setSubmissions([]);
        setEvaluationResults({});
        setMentorMarks({});
        showToast('Logged out', 'info');
    };

    // ---- Fetch Data ----
    const fetchTeams = useCallback(async () => {
        try {
            const data = await apiFetch('/teams');
            setTeams(data);
        } catch (err) {
            console.error('Error fetching teams:', err);
        }
    }, []);

    const fetchSubmissions = useCallback(async () => {
        try {
            const data = await apiFetch('/submissions');
            setSubmissions(data);
        } catch (err) {
            console.error('Error fetching submissions:', err);
        }
    }, []);

    const fetchEvaluations = useCallback(async () => {
        try {
            const data = await apiFetch('/evaluations');
            const map = {};
            data.forEach(ev => { map[ev.submission_id] = ev; });
            setEvaluationResults(map);
        } catch (err) {
            console.error('Error fetching evaluations:', err);
        }
    }, []);

    const fetchMentorMarks = useCallback(async () => {
        try {
            const data = await apiFetch('/mentor-marks');
            const map = {};
            data.forEach(m => { map[m.team_id] = m; });
            setMentorMarks(map);
        } catch (err) {
            console.error('Error fetching mentor marks:', err);
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const data = await apiFetch('/settings');
            setUnlockedRequirementsState(data.unlocked_requirements || 5);
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    }, []);

    const setUnlockedRequirements = async (count) => {
        try {
            const data = await apiFetch('/settings/unlocked-requirements', {
                method: 'PUT',
                body: JSON.stringify({ count }),
            });
            setUnlockedRequirementsState(data.unlocked_requirements);
            showToast(`Requirement R${count} unlocked for all teams!`, 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const refreshAll = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        await Promise.all([fetchTeams(), fetchSubmissions(), fetchEvaluations(), fetchMentorMarks(), fetchSettings()]);
        setLoading(false);
    }, [user, fetchTeams, fetchSubmissions, fetchEvaluations, fetchMentorMarks, fetchSettings]);

    useEffect(() => {
        if (user) refreshAll();
    }, [user]);

    // ---- Team CRUD ----
    const updateTeamDetails = async (teamId, { members, mentor }) => {
        try {
            await apiFetch(`/teams/${teamId}/details`, {
                method: 'PUT',
                body: JSON.stringify({ members, mentor }),
            });
            showToast('Team details saved!', 'success');
            fetchTeams();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const assignUseCase = async (teamId, useCaseId) => {
        try {
            await apiFetch(`/teams/${teamId}/usecase`, {
                method: 'PUT',
                body: JSON.stringify({ useCaseId }),
            });
            showToast(useCaseId ? 'Use case assigned!' : 'Use case unassigned', 'success');
            fetchTeams();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // ---- Submissions ----
    const addSubmission = async (subData) => {
        try {
            await apiFetch('/submissions', {
                method: 'POST',
                body: JSON.stringify(subData),
            });
            showToast('Submission added!', 'success');
            fetchSubmissions();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const deleteSubmission = async (id) => {
        try {
            await apiFetch(`/submissions/${id}`, { method: 'DELETE' });
            showToast('Submission deleted', 'info');
            fetchSubmissions();
            fetchEvaluations();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const deleteAllSubmissions = async () => {
        try {
            await apiFetch('/submissions', { method: 'DELETE' });
            showToast('All submissions deleted', 'info');
            fetchSubmissions();
            fetchEvaluations();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const deleteTeamSubmissions = async (teamId) => {
        try {
            await apiFetch(`/submissions?teamId=${teamId}`, { method: 'DELETE' });
            showToast('Team submissions deleted', 'info');
            fetchSubmissions();
            fetchEvaluations();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // ---- Evaluations ----
    const updateEvaluationResult = async (submissionId, result) => {
        try {
            await apiFetch('/evaluations', {
                method: 'POST',
                body: JSON.stringify({ submissionId, ...result }),
            });
            showToast('Evaluation saved!', 'success');
            fetchEvaluations();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // ---- Mentor Marks ----
    const updateMentorMarks = async (teamId, marks) => {
        try {
            await apiFetch('/mentor-marks', {
                method: 'POST',
                body: JSON.stringify({ teamId, ...marks }),
            });
            showToast('Mentor marks saved!', 'success');
            fetchMentorMarks();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // ---- Leaderboard ----
    const getLeaderboardData = useCallback(() => {
        return teams.map(team => {
            const teamSubs = submissions.filter(s => s.team_id === team.id || s.team_number === team.team_number);
            const teamEvals = teamSubs
                .map(s => evaluationResults[s.id])
                .filter(Boolean);

            const aiScore = teamEvals.length
                ? Math.round(teamEvals.reduce((sum, e) => sum + (e.total_score || 0), 0) / teamEvals.length)
                : 0;

            const marks = mentorMarks[team.id] || {};
            // Phase marks (6 × 10 = 60)
            const phaseScore = (marks.phase1 || 0) + (marks.phase2 || 0) + (marks.phase3 || 0)
                + (marks.innovation || 0) + (marks.presentation || 0) + (marks.teamwork || 0);
            // Requirement marks (up to 10 × 10 = 100)
            const uc = team.use_case_id ? USE_CASES.find(u => u.id === team.use_case_id) : null;
            const reqScore = uc
                ? uc.requirements.reduce((sum, _, idx) => sum + (Number(marks[`req_${idx + 1}`]) || 0), 0)
                : 0;
            const mentorScore = phaseScore + reqScore;

            const reqSatisfied = teamEvals.reduce((sum, e) => sum + (e.requirements_met || 0), 0);
            const totalReqs = teamEvals.reduce((sum, e) => sum + (e.total_requirements || 0), 0);

            return {
                id: team.id,
                teamNumber: team.team_number,
                name: team.name,
                useCaseId: team.use_case_id,
                useCaseTitle: uc ? `#${uc.id} ${uc.title}` : 'Not Assigned',
                aiScore,
                phaseScore,
                reqScore,
                mentorScore,
                totalScore: aiScore + mentorScore,
                submissionCount: teamSubs.length,
                reqSatisfied,
                totalReqs,
            };
        }).sort((a, b) => b.totalScore - a.totalScore);
    }, [teams, submissions, evaluationResults, mentorMarks]);

    // ---- Context Value ----
    const contextValue = {
        user,
        login,
        logout,
        teams,
        submissions,
        evaluationResults,
        mentorMarks,
        unlockedRequirements,
        setUnlockedRequirements,
        useCases: USE_CASES,
        hackathonInfo: HACKATHON_INFO,
        loading,
        showToast,
        refreshAll,
        fetchTeams,
        fetchSubmissions,
        fetchEvaluations,
        updateTeamDetails,
        assignUseCase,
        addSubmission,
        deleteSubmission,
        deleteAllSubmissions,
        deleteTeamSubmissions,
        updateEvaluationResult,
        updateMentorMarks,
        getLeaderboardData,
    };

    return (
        <AppContext.Provider value={contextValue}>
            <BrowserRouter>
                {/* Toast */}
                {toast && (
                    <div className={`toast toast-${toast.type}`}>
                        <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
                        <span>{toast.message}</span>
                    </div>
                )}

                <Routes>
                    <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/team'} /> : <LoginPage />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* Team Routes */}
                    <Route path="/team" element={user?.role === 'team' ? <TeamLayout /> : <Navigate to="/" />}>
                        <Route index element={<TeamHome />} />
                        <Route path="rules" element={<TeamRules />} />
                        <Route path="timeline" element={<TeamTimeline />} />
                        <Route path="details" element={<TeamDetails />} />
                        <Route path="usecases" element={<TeamUseCases />} />
                        <Route path="submission" element={<TeamSubmission />} />
                        <Route path="leaderboard" element={<TeamLeaderboard />} />
                        <Route path="mentor-marks" element={<TeamMentorMarks />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route path="/admin" element={user?.role === 'admin' ? <AdminLayout /> : <Navigate to="/" />}>
                        <Route index element={<AdminHome />} />
                        <Route path="assign" element={<AdminUseCaseAssign />} />
                        <Route path="teams" element={<AdminTeamDetails />} />
                        <Route path="submissions" element={<AdminSubmissions />} />
                        <Route path="leaderboard" element={<AdminLeaderboard />} />
                        <Route path="mentor-marks" element={<AdminMentorMarks />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </AppContext.Provider>
    );
}

export default App;
