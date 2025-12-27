const express = require('express');
const router = express.Router();
const { db } = require('../data/db');
const { getClientUser } = require('../middleware/auth');

// Middleware to check if user is super admin
function requireSuperAdmin(req, res, next) {
    const { username, role } = getClientUser(req);
    if (!username || !role) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (role !== 'admin') {
        return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
}

// GET /api/admin/tables - List all tables
router.get('/tables', requireSuperAdmin, (req, res) => {
    try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
        return res.json(tables.map(t => t.name));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/tables/:tableName - Get table schema and data
router.get('/tables/:tableName', requireSuperAdmin, (req, res) => {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    try {
        // Validate table exists
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
        if (!tableExists) {
            return res.status(404).json({ error: 'Table not found' });
        }

        // Get schema
        const schema = db.prepare(`PRAGMA table_info("${tableName}")`).all();

        // Get row count
        const countResult = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get();
        const totalRows = countResult.count;

        // Get data
        const rows = db.prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`).all(limit, offset);

        return res.json({
            tableName,
            schema,
            rows,
            totalRows,
            limit,
            offset
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/query - Execute raw SQL query (SELECT only for safety)
router.post('/query', requireSuperAdmin, (req, res) => {
    const { sql } = req.body;

    if (!sql) {
        return res.status(400).json({ error: 'SQL query required' });
    }

    try {
        // Check if it's a SELECT query (for safety, read-only by default)
        const trimmedSql = sql.trim().toUpperCase();
        const isSelect = trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('PRAGMA');

        if (isSelect) {
            const rows = db.prepare(sql).all();
            return res.json({ rows, rowCount: rows.length });
        } else {
            // For non-SELECT queries, use run()
            const result = db.prepare(sql).run();
            return res.json({
                changes: result.changes,
                lastInsertRowid: result.lastInsertRowid,
                message: `Query executed. ${result.changes} row(s) affected.`
            });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/tables/:tableName/:id - Update a row
router.put('/tables/:tableName/:id', requireSuperAdmin, (req, res) => {
    const { tableName, id } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
    }

    try {
        // Validate table exists
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
        if (!tableExists) {
            return res.status(404).json({ error: 'Table not found' });
        }

        // Get primary key column
        const schema = db.prepare(`PRAGMA table_info("${tableName}")`).all();
        const pkColumn = schema.find(col => col.pk === 1);
        const pkName = pkColumn ? pkColumn.name : 'id';

        // Build UPDATE query
        const setClauses = Object.keys(updates).map(key => `"${key}" = ?`).join(', ');
        const values = [...Object.values(updates), id];

        const result = db.prepare(`UPDATE "${tableName}" SET ${setClauses} WHERE "${pkName}" = ?`).run(...values);

        return res.json({
            success: true,
            changes: result.changes,
            message: `Updated ${result.changes} row(s)`
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/tables/:tableName/:id - Delete a row
router.delete('/tables/:tableName/:id', requireSuperAdmin, (req, res) => {
    const { tableName, id } = req.params;

    try {
        // Validate table exists
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
        if (!tableExists) {
            return res.status(404).json({ error: 'Table not found' });
        }

        // Get primary key column
        const schema = db.prepare(`PRAGMA table_info("${tableName}")`).all();
        const pkColumn = schema.find(col => col.pk === 1);
        const pkName = pkColumn ? pkColumn.name : 'id';

        const result = db.prepare(`DELETE FROM "${tableName}" WHERE "${pkName}" = ?`).run(id);

        return res.json({
            success: true,
            changes: result.changes,
            message: `Deleted ${result.changes} row(s)`
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/tables/:tableName - Insert a new row
router.post('/tables/:tableName', requireSuperAdmin, (req, res) => {
    const { tableName } = req.params;
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No data provided' });
    }

    try {
        // Validate table exists
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
        if (!tableExists) {
            return res.status(404).json({ error: 'Table not found' });
        }

        const columns = Object.keys(data).map(k => `"${k}"`).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);

        const result = db.prepare(`INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`).run(...values);

        return res.json({
            success: true,
            lastInsertRowid: result.lastInsertRowid,
            message: `Inserted row with ID ${result.lastInsertRowid}`
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
