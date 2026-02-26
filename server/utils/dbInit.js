
import pool from '../db.js';

export async function initDb() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      team_number INT,
      team_name VARCHAR(255),
      batch VARCHAR(10) DEFAULT '2027',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_number INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      use_case_id INT,
      members TEXT,
      mentor TEXT,
      batch VARCHAR(10) DEFAULT '2027',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_team_batch (team_number, batch)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      team_number INT NOT NULL,
      team_name VARCHAR(255),
      batch VARCHAR(10),
      phase VARCHAR(50) NOT NULL,
      requirement_number INT NOT NULL,
      github_url TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS evaluation_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      submission_id INT UNIQUE NOT NULL,
      code_quality INT DEFAULT 0,
      req_satisfaction INT DEFAULT 0,
      innovation INT DEFAULT 0,
      total_score INT DEFAULT 0,
      requirements_met INT DEFAULT 0,
      total_requirements INT DEFAULT 10,
      feedback TEXT,
      detailed_report LONGTEXT,
      file_tree LONGTEXT,
      evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS mentor_marks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT UNIQUE NOT NULL,
      phase1 INT DEFAULT 0, phase2 INT DEFAULT 0, phase3 INT DEFAULT 0,
      innovation INT DEFAULT 0, presentation INT DEFAULT 0, teamwork INT DEFAULT 0,
      req1 INT DEFAULT 0, req2 INT DEFAULT 0, req3 INT DEFAULT 0, req4 INT DEFAULT 0, req5 INT DEFAULT 0,
      req6 INT DEFAULT 0, req7 INT DEFAULT 0, req8 INT DEFAULT 0, req9 INT DEFAULT 0, req10 INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS team_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'todo',
      assigned_to VARCHAR(255),
      priority VARCHAR(20) DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      category VARCHAR(100) NOT NULL,
      message TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      mentor_id INT,
      mentor_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      UNIQUE KEY unique_team_cert (team_id, type)
    )
  `);

  console.log('✅ Database Schema Verified');
}
