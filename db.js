const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Initialize Tables
        db.serialize(() => {
            // Tasks table
            db.run(`CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                priority TEXT DEFAULT 'medium',
                updated_at INTEGER DEFAULT 0,
                is_deleted INTEGER DEFAULT 0
            )`);

            // Links table
            db.run(`CREATE TABLE IF NOT EXISTS links (
                id TEXT PRIMARY KEY,
                task_id TEXT,
                url TEXT NOT NULL,
                title TEXT,
                updated_at INTEGER DEFAULT 0,
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )`);
            
            // Safe ALTER TABLE for existing databases
            const addColumnSafely = (table, column, typeDef) => {
                db.all(`PRAGMA table_info(${table})`, (err, rows) => {
                    if (err) return;
                    if (!rows.some(r => r.name === column)) {
                        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`, (alterErr) => {
                            if (alterErr) console.error(`Error adding ${column} to ${table}:`, alterErr.message);
                        });
                    }
                });
            };

            addColumnSafely('tasks', 'updated_at', 'INTEGER DEFAULT 0');
            addColumnSafely('tasks', 'is_deleted', 'INTEGER DEFAULT 0');
            addColumnSafely('links', 'updated_at', 'INTEGER DEFAULT 0');
            addColumnSafely('links', 'is_deleted', 'INTEGER DEFAULT 0');
            
            // Note: SQLite foreign keys are disabled by default. 
            // We should enable them for ON DELETE CASCADE to work.
            db.run('PRAGMA foreign_keys = ON');
        });
    }
});

module.exports = db;
