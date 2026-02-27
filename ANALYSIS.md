# HackMaster 3.0 - Project Analysis Report

## 1. Project Overview
**HackMaster 3.0** is an advanced hackathon management platform specifically designed for the **Healthcare AI Hackathon 2026** at Sri Manakula Vinayagar Engineering College. It serves as a centralized hub for teams, mentors, and administrators.

## 2. Technical Architecture

### Frontend (Client-Side)
- **Framework**: React 19.
- **Build Tool**: Vite.
- **Styling**: Tailwind CSS (Native CSS with utility patterns).
- **Icons**: Lucide-React.
- **Charts**: Recharts for administrative analytics.

### Backend (Server-Side)
- **Environment**: Node.js (ES Modules).
- **Framework**: Express.js.
- **Database**: MySQL (TiDB Cloud) for high-scale relational data management.
- **Authentication**: JWT (JSON Web Tokens) with Bcrypt for password hashing.
- **File Export**: Core support for PDF generation (jsPDF) and local storage integration.

## 3. Key Features

### A. Team & Submission Management
- Multi-batch support (Batch 2027 & 2028).
- Automated GitHub commit tracking and AI-driven code evaluation.
- Multi-phase submission workflow (Phase 1, 2, 3, Jury).

### B. Evaluation System
The platform implements a tri-factor scoring system:
1. **AI Score**: Automated assessment of technical implementation via GitHub.
2. **Mentor Marks**: Qualitative grading on phase progress (Innovation, Teamwork, etc.).
3. **Requirement Satisfaction**: 10 granular requirements per use case, graded individually.

### C. Live Leaderboard
Real-time normalization and ranking of teams based on accumulated scores across all evaluation factors.

## 4. 2028 Batch (2nd Year) Use Case Update
Successfully integrated **33 moderate AI project use cases** into the Batch 2028 catalog. 

**Categories added:**
- **NLP & LLMs**: Fact-checkers, legal assistants, meeting summarizers.
- **Computer Vision**: Sign language translation, pose estimation for fitness, plant disease detection.
- **IoT & Predictive**: Smart home energy, retail inventory management, traffic flow prediction.
- **Social Impact**: Disaster response, waste sorting, wildfire risk assessment.

## 5. Security & Stability
- Environment-based configuration (`.env`).
- Database connection pooling.
- Backend modularity (Routes separated from core logic).

---
*Report generated on February 27, 2026*
