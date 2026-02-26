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
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminTasks from './pages/admin/AdminTasks';
import TeamTasks from './pages/team/TeamTasks';

// Data
import { USE_CASES, USE_CASES_2ND_YEAR, HACKATHON_INFO, BATCHES, getUseCasesByBatch } from './data/constants';

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
    const [selectedBatch, setSelectedBatch] = useState('2027');
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
            const batch = user?.role === 'admin' ? selectedBatch : (user?.batch || '2027');
            const data = await apiFetch(`/teams?batch=${batch}`);
            setTeams(data);
        } catch (err) {
            console.error('Error fetching teams:', err);
        }
    }, [selectedBatch, user]);

    const fetchSubmissions = useCallback(async () => {
        try {
            const batch = user?.role === 'admin' ? selectedBatch : (user?.batch || '2027');
            const data = await apiFetch(`/submissions?batch=${batch}`);
            setSubmissions(data);
        } catch (err) {
            console.error('Error fetching submissions:', err);
        }
    }, [selectedBatch, user]);

    const fetchEvaluations = useCallback(async () => {
        try {
            const batch = user?.role === 'admin' ? selectedBatch : (user?.batch || '2027');
            const data = await apiFetch(`/evaluations?batch=${batch}`);
            const map = {};
            data.forEach(ev => { map[ev.submission_id] = ev; });
            setEvaluationResults(map);
        } catch (err) {
            console.error('Error fetching evaluations:', err);
        }
    }, [selectedBatch, user]);

    const fetchMentorMarks = useCallback(async () => {
        try {
            const batch = user?.role === 'admin' ? selectedBatch : (user?.batch || '2027');
            const data = await apiFetch(`/mentor-marks?batch=${batch}`);
            const map = {};
            data.forEach(m => { map[m.team_id] = m; });
            setMentorMarks(map);
        } catch (err) {
            console.error('Error fetching mentor marks:', err);
        }
    }, [selectedBatch, user]);

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
    }, [user, selectedBatch]);

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

    const clearTeamRegistration = async (teamId) => {
        try {
            await apiFetch(`/teams/${teamId}/registration`, { method: 'DELETE' });
            showToast('Team registration cleared!', 'success');
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
            if (!window.confirm(`Are you sure you want to delete ALL submissions for the ${selectedBatch} batch? This action is IRREVERSIBLE.`)) return;
            await apiFetch(`/submissions?batch=${selectedBatch}`, { method: 'DELETE' });
            showToast('Batch submissions cleared!', 'info');
            fetchSubmissions();
            fetchEvaluations();
            fetchTeams();
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

    const deleteAllMentorMarks = async () => {
        try {
            if (!window.confirm(`Are you sure you want to delete ALL mentor marks for the ${selectedBatch} batch?`)) return;
            await apiFetch(`/mentor-marks?batch=${selectedBatch}`, { method: 'DELETE' });
            showToast('All mentor marks cleared!', 'info');
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
            const batchUCs = getUseCasesByBatch(team.batch || '2027');
            const uc = team.use_case_id ? batchUCs.find(u => u.id === team.use_case_id) : null;

            let reqScore = 0;
            if (uc && uc.requirements) {
                for (let i = 1; i <= uc.requirements.length; i++) {
                    reqScore += (Number(marks[`req${i}`]) || 0);
                }
            }

            // Normalization to 100 scale
            const normAi = aiScore;
            const normPhase = Math.round((phaseScore / 60) * 100);
            const normReq = (uc && uc.requirements && uc.requirements.length > 0) ? Math.round((reqScore / (uc.requirements.length * 10)) * 100) : 0;

            // Consolidated Total (Average of the three components)
            const totalScore = Math.round((normAi + normPhase + normReq) / 3);

            const reqSatisfied = teamEvals.reduce((sum, e) => sum + (e.requirements_met || 0), 0);
            const totalReqs = teamEvals.reduce((sum, e) => sum + (e.total_requirements || 0), 0);

            return {
                id: team.id,
                teamNumber: team.team_number,
                name: team.name,
                useCaseId: team.use_case_id,
                useCaseTitle: uc ? `#${uc.id} ${uc.title}` : 'Not Assigned',
                aiScore,
                phaseScore, // Raw sum (out of 60)
                reqScore: normReq, // Normalized (out of 100)
                normPhase, // Normalized (out of 100)
                totalScore,
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
        useCases2ndYear: USE_CASES_2ND_YEAR,
        allUseCases: { '2027': USE_CASES, '2028': USE_CASES_2ND_YEAR },
        getUseCasesByBatch,
        batches: BATCHES,
        selectedBatch,
        setSelectedBatch,
        hackathonInfo: HACKATHON_INFO,
        loading,
        showToast,
        refreshAll,
        fetchTeams,
        fetchSubmissions,
        fetchEvaluations,
        updateTeamDetails,
        assignUseCase,
        clearTeamRegistration,
        addSubmission,
        deleteSubmission,
        deleteAllSubmissions,
        deleteTeamSubmissions,
        updateEvaluationResult,
        updateMentorMarks,
        deleteAllMentorMarks,
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
                        <Route path="tasks" element={<TeamTasks />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route path="/admin" element={user?.role === 'admin' ? <AdminLayout /> : <Navigate to="/" />}>
                        <Route index element={<AdminHome />} />
                        <Route path="assign" element={<AdminUseCaseAssign />} />
                        <Route path="teams" element={<AdminTeamDetails />} />
                        <Route path="submissions" element={<AdminSubmissions />} />
                        <Route path="leaderboard" element={<AdminLeaderboard />} />
                        <Route path="mentor-marks" element={<AdminMentorMarks />} />
                        <Route path="analytics" element={<AdminAnalytics />} />
                        <Route path="tasks" element={<AdminTasks />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </AppContext.Provider>
    );
}

export default App;
