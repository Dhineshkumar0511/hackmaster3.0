
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all use cases
router.get('/', async (req, res) => {
    try {
        const batch = req.query.batch;
        let query = 'SELECT * FROM use_cases';
        let params = [];

        if (batch) {
            query += ' WHERE batch = ?';
            params.push(batch);
        }

        const [rows] = await pool.execute(query, params);

        // Parse requirements JSON string back to array
        const parsedRows = rows.map(row => ({
            ...row,
            requirements: JSON.parse(row.requirements || '[]')
        }));

        res.json(parsedRows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add a single use case
router.post('/', async (req, res) => {
    try {
        const { title, difficulty, tech, objective, domainChallenge, requirements, batch } = req.body;

        const [result] = await pool.execute(
            'INSERT INTO use_cases (title, difficulty, tech, objective, domainChallenge, requirements, batch) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, difficulty, tech, objective, domainChallenge, JSON.stringify(requirements || []), batch]
        );

        res.status(201).json({ id: result.insertId, message: 'Use case added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add multiple use cases (Bulk)
router.post('/bulk', async (req, res) => {
    try {
        const { useCases } = req.body;

        if (!Array.isArray(useCases) || useCases.length === 0) {
            return res.status(400).json({ error: 'Valid array of use cases is required' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const uc of useCases) {
                const { title, difficulty, tech, objective, domainChallenge, requirements, batch } = uc;
                await connection.execute(
                    'INSERT INTO use_cases (title, difficulty, tech, objective, domainChallenge, requirements, batch) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [title || 'Untitled', difficulty || 'Medium', tech || '', objective || '', domainChallenge || '', JSON.stringify(requirements || []), batch]
                );
            }

            await connection.commit();
            res.status(201).json({ message: `${useCases.length} use cases added successfully` });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete all use cases in a batch
router.delete('/batch/:batch', async (req, res) => {
    try {
        const { batch } = req.params;
        await pool.execute('DELETE FROM use_cases WHERE batch = ?', [batch]);
        res.json({ message: `All use cases for batch ${batch} deleted successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a use case
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM use_cases WHERE id = ?', [id]);
        res.json({ message: 'Use case deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
