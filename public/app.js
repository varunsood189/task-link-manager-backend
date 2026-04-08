document.addEventListener('DOMContentLoaded', () => {
  const taskListElement = document.getElementById('task-list');
  const addTaskForm = document.getElementById('add-task-form');
  const newTaskInput = document.getElementById('new-task-input');
  const newTaskDesc = document.getElementById('new-task-desc');
  const newTaskPriority = document.getElementById('new-task-priority');

  const taskTemplate = document.getElementById('task-template');
  const linkTemplate = document.getElementById('link-template');

  let tasks = [];
  const API_BASE = '/api/tasks';

  loadTasks();

  addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = newTaskInput.value.trim();
    const desc = newTaskDesc.value.trim();
    const priority = newTaskPriority.value;

    if (title) {
      addTask(title, desc, priority);
      newTaskInput.value = '';
      newTaskDesc.value = '';
      newTaskPriority.value = 'medium';
    }
  });

  async function loadTasks() {
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        tasks = await response.json();
        renderTasks();
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      // Fallback empty state on network error
      taskListElement.innerHTML = '<div class="empty-state">Unable to connect to server. Ensure the backend is running.</div>';
    }
  }

  async function addTask(title, desc, priority) {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc, priority })
      });
      if (response.ok) {
        const newTask = await response.json();
        tasks.unshift(newTask);
        renderTasks();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  }

  async function updateTask(taskId, title, desc, priority) {
    try {
      const response = await fetch(`${API_BASE}/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc, priority })
      });
      if (response.ok) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.title = title;
          task.description = desc;
          task.priority = priority;
          renderTasks();
        }
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }

  async function deleteTask(taskId) {
    try {
      const response = await fetch(`${API_BASE}/${taskId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        tasks = tasks.filter(t => t.id !== taskId);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }

  async function addLink(taskId, url, title = '') {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    try {
      const response = await fetch(`${API_BASE}/${taskId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title: title || url })
      });
      if (response.ok) {
        const newLink = await response.json();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.links.push(newLink);
          renderTasks();
        }
      }
    } catch (err) {
      console.error('Failed to add link:', err);
    }
  }

  async function deleteLink(taskId, linkId) {
    try {
      const response = await fetch(`${API_BASE}/${taskId}/links/${linkId}`, {
         method: 'DELETE'
      });
      if (response.ok) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.links = task.links.filter(l => l.id !== linkId);
          renderTasks();
        }
      }
    } catch (err) {
       console.error('Failed to delete link:', err);
    }
  }

  function renderTasks() {
    taskListElement.innerHTML = '';
    
    const activeTasks = tasks.filter(t => !t.is_deleted);
    
    if (activeTasks.length === 0) {
      taskListElement.innerHTML = '<div class="empty-state">No tasks yet. Create one above!</div>';
      return;
    }

    activeTasks.forEach(task => {
      const taskNode = document.importNode(taskTemplate.content, true);
      const li = taskNode.querySelector('.task-item');
      li.dataset.taskId = task.id;

      // Set display fields
      taskNode.querySelector('.task-title').textContent = task.title;
      
      const priorityBadge = taskNode.querySelector('.priority-badge');
      if(task.priority) {
          priorityBadge.textContent = task.priority;
          priorityBadge.classList.add(task.priority);
      } else {
          priorityBadge.style.display = 'none';
      }

      const descNode = taskNode.querySelector('.task-desc');
      if (task.description) {
        descNode.textContent = task.description;
        descNode.style.display = 'block';
      } else {
        descNode.style.display = 'none';
      }

      // Handle Task Edit
      const displayMode = taskNode.querySelector('.task-display-mode');
      const editMode = taskNode.querySelector('.task-edit-mode');
      const editTitleInput = taskNode.querySelector('.edit-task-title');
      const editDescInput = taskNode.querySelector('.edit-task-desc');
      const editPrioritySelect = taskNode.querySelector('.edit-task-priority');

      taskNode.querySelector('.btn-edit-task').addEventListener('click', () => {
        displayMode.style.display = 'none';
        editMode.style.display = 'flex';
        editTitleInput.value = task.title;
        editDescInput.value = task.description || '';
        if(task.priority) editPrioritySelect.value = task.priority;
      });

      taskNode.querySelector('.btn-cancel-edit').addEventListener('click', () => {
        editMode.style.display = 'none';
        displayMode.style.display = 'flex';
      });

      editMode.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTitle = editTitleInput.value.trim();
        const newDesc = editDescInput.value.trim();
        const newPriority = editPrioritySelect.value;
        if (newTitle) {
          updateTask(task.id, newTitle, newDesc, newPriority);
        }
      });

      // Handle Task Delete
      taskNode.querySelector('.btn-delete-task').addEventListener('click', () => {
        li.style.opacity = '0';
        li.style.transform = 'scale(0.95)';
        setTimeout(() => {
          deleteTask(task.id);
          li.remove();
        }, 200);
      });

      // Render Links
      const linkListElement = taskNode.querySelector('.link-list');
      (task.links || []).filter(l => !l.is_deleted).forEach((link, idx) => {
        const linkNode = document.importNode(linkTemplate.content, true);
        const linkEl = linkNode.querySelector('.link-item');
        
        linkEl.style.animationDelay = `${idx * 0.05}s`;

        const anchor = linkNode.querySelector('.link-anchor');
        anchor.href = link.url;
        anchor.textContent = link.title || link.url;
        anchor.title = link.url; 

        linkNode.querySelector('.btn-delete-link').addEventListener('click', () => {
          deleteLink(task.id, link.id);
          linkEl.remove();
        });

        linkListElement.appendChild(linkNode);
      });

      // Handle Add Link Manual
      const addLinkForm = taskNode.querySelector('.add-link-form');
      const newLinkInput = taskNode.querySelector('.new-link-input');
      addLinkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = newLinkInput.value.trim();
        if (url) {
          addLink(task.id, url);
          newLinkInput.value = '';
        }
      });

      taskListElement.appendChild(taskNode);
    });
  }
});
