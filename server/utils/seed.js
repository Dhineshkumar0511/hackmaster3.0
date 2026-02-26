
import bcrypt from 'bcryptjs';

export async function seedTeams(pool, batch, teamNames) {
    for (let i = 0; i < teamNames.length; i++) {
        const teamNum = i + 1;
        const teamName = teamNames[i];
        const prefix = batch === '2028' ? '2y_' : '';
        const username = `${prefix}team${teamNum}`;
        const password = `${prefix}team${teamNum}@hack`;
        const passwordHash = bcrypt.hashSync(password, 10);

        await pool.execute(
            'INSERT IGNORE INTO users (username, password, role, team_number, team_name, batch) VALUES (?, ?, ?, ?, ?, ?)',
            [username, passwordHash, 'team', teamNum, teamName, batch]
        );

        await pool.execute(
            'INSERT IGNORE INTO teams (team_number, name, members, mentor, batch) VALUES (?, ?, ?, ?, ?)',
            [teamNum, teamName, '[]', '{}', batch]
        );
    }
}
