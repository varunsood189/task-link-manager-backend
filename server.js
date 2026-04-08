const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files for the companion website
app.use(express.static(path.join(__dirname, 'public')));

// === API Routes ===

// Enable ON DELETE CASCADE for foreign keys per connection
app.use((req, res, next) => {
  db.run('PRAGMA foreign_keys = ON', next);
});

// GET all tasks (including their links)
app.get('/api/tasks', (req, res) => {
    db.all('SELECT * FROM tasks ORDER BY rowid DESC', [], (err, tasks) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (tasks.length === 0) {
            return res.json([]);
        }

        // Fetch links for all tasks
        db.all('SELECT * FROM links', [], (err, links) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Group links by task_id
            const linksByTaskId = {};
            links.forEach(link => {
                if (!linksByTaskId[link.task_id]) {
                    linksByTaskId[link.task_id] = [];
                }
                linksByTaskId[link.task_id].push(link);
            });

            // Attach links to tasks
            const tasksWithLinks = tasks.map(task => ({
                ...task,
                links: linksByTaskId[task.id] || []
            }));

            res.json(tasksWithLinks);
        });
    });
});

// POST a new task
app.post('/api/tasks', (req, res) => {
    const { id, title, description, priority, updated_at, is_deleted } = req.body;
    
    // We allow the client to specify the ID to match their local timestamp format
    const taskId = id || Date.now().toString();
    const taskPriority = priority || 'medium';
    const taskUpdatedAt = updated_at || Date.now();
    const taskIsDeleted = is_deleted === undefined ? 0 : is_deleted;

    const stmt = db.prepare(`
        INSERT INTO tasks (id, title, description, priority, updated_at, is_deleted) 
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
            title=excluded.title, 
            description=excluded.description, 
            priority=excluded.priority, 
            updated_at=excluded.updated_at, 
            is_deleted=excluded.is_deleted 
        WHERE excluded.updated_at > tasks.updated_at
    `);
    
    stmt.run([taskId, title, description, taskPriority, taskUpdatedAt, taskIsDeleted], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.status(201).json({ 
            id: taskId, title, description, priority: taskPriority, 
            updated_at: taskUpdatedAt, is_deleted: taskIsDeleted, links: [] 
        });
    });
    stmt.finalize();
});

// PUT update an existing task
app.put('/api/tasks/:id', (req, res) => {
    const { title, description, priority, updated_at, is_deleted } = req.body;
    const { id } = req.params;

    const taskUpdatedAt = updated_at || Date.now();
    const stmt = db.prepare(`
        UPDATE tasks 
        SET title = COALESCE(?, title), 
            description = COALESCE(?, description), 
            priority = COALESCE(?, priority),
            updated_at = ?,
            is_deleted = COALESCE(?, is_deleted)
        WHERE id = ? AND ? >= updated_at
    `);
    stmt.run([title, description, priority, taskUpdatedAt, is_deleted, id, taskUpdatedAt], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
           return res.status(404).json({ error: 'Task not found or newer version exists' });
        }
        res.json({ message: 'Task updated successfully' });
    });
    stmt.finalize();
});

// DELETE a task
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const updated_at = Date.now();
    
    // Soft delete task
    const stmt = db.prepare('UPDATE tasks SET is_deleted = 1, updated_at = ? WHERE id = ?');
    stmt.run([updated_at, id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
           return res.status(404).json({ error: 'Task not found' });
        }
        
        // Cascade soft delete to links
        const linkStmt = db.prepare('UPDATE links SET is_deleted = 1, updated_at = ? WHERE task_id = ?');
        linkStmt.run([updated_at, id]);
        linkStmt.finalize();

        res.json({ message: 'Task deleted successfully' });
    });
    stmt.finalize();
});

// POST a new link to a task
app.post('/api/tasks/:id/links', (req, res) => {
    const { url, title, id: clientLinkId, updated_at, is_deleted } = req.body;
    const { id: taskId } = req.params;
    
    const linkId = clientLinkId || Date.now().toString();
    const linkUpdatedAt = updated_at || Date.now();
    const linkIsDeleted = is_deleted === undefined ? 0 : is_deleted;

    const stmt = db.prepare(`
        INSERT INTO links (id, task_id, url, title, updated_at, is_deleted) 
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            url=excluded.url,
            title=excluded.title,
            updated_at=excluded.updated_at,
            is_deleted=excluded.is_deleted
        WHERE excluded.updated_at > links.updated_at
    `);
    
    stmt.run([linkId, taskId, url, title, linkUpdatedAt, linkIsDeleted], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        // Also update task's updated_at
        const taskStmt = db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ? AND ? > updated_at');
        taskStmt.run([linkUpdatedAt, taskId, linkUpdatedAt]);
        taskStmt.finalize();

        res.status(201).json({ id: linkId, task_id: taskId, url, title, updated_at: linkUpdatedAt, is_deleted: linkIsDeleted });
    });
    stmt.finalize();
});

// DELETE a link
app.delete('/api/tasks/:taskId/links/:linkId', (req, res) => {
    const { taskId, linkId } = req.params;
    const updated_at = Date.now();

    const stmt = db.prepare('UPDATE links SET is_deleted = 1, updated_at = ? WHERE id = ? AND task_id = ?');
    stmt.run([updated_at, linkId, taskId], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }
        
        // Update task's updated_at
        const taskStmt = db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ? AND ? > updated_at');
        taskStmt.run([updated_at, taskId, updated_at]);
        taskStmt.finalize();

        res.json({ message: 'Link deleted successfully' });
    });
    stmt.finalize();
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
