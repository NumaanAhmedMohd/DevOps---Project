// Dashboard page logic
(function () {
  if (!requireAuth()) return;

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Set sidebar user info
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const sidebarName = document.getElementById('sidebar-name');
  const sidebarEmail = document.getElementById('sidebar-email');
  if (sidebarAvatar) sidebarAvatar.textContent = getInitials(user.name);
  if (sidebarName) sidebarName.textContent = user.name || 'User';
  if (sidebarEmail) sidebarEmail.textContent = user.email || '';

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/index.html';
  });

  // ---- Modal open/close ----
  const createModal = document.getElementById('create-modal');
  const createForm = document.getElementById('create-project-form');
  const createError = document.getElementById('create-error');
  const createBtn = document.getElementById('create-project-btn');

  function openCreateModal() { createModal.classList.add('active'); }
  function closeCreateModal() {
    createModal.classList.remove('active');
    createForm.reset();
    createError.classList.remove('show');
    document.getElementById('project-key')._manuallyEdited = false;
  }

  document.getElementById('open-create-modal')?.addEventListener('click', openCreateModal);
  document.getElementById('open-create-modal-2')?.addEventListener('click', openCreateModal);
  document.getElementById('close-create-modal')?.addEventListener('click', closeCreateModal);
  document.getElementById('cancel-create')?.addEventListener('click', closeCreateModal);
  createModal?.addEventListener('click', (e) => { if (e.target === createModal) closeCreateModal(); });

  // Auto-generate project key
  document.getElementById('project-name')?.addEventListener('input', (e) => {
    const keyInput = document.getElementById('project-key');
    if (!keyInput._manuallyEdited) {
      keyInput.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    }
  });
  document.getElementById('project-key')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
    e.target._manuallyEdited = true;
  });

  // Create project
  createForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    createError.classList.remove('show');
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="spinner"></span> Creating...';

    try {
      await api.post('/projects', {
        name: document.getElementById('project-name').value,
        key: document.getElementById('project-key').value,
        description: document.getElementById('project-description').value,
      });
      closeCreateModal();
      showToast('Project created!', 'success');
      await loadAll();
    } catch (err) {
      createError.textContent = err.message;
      createError.classList.add('show');
    } finally {
      createBtn.disabled = false;
      createBtn.innerHTML = 'Create Project';
    }
  });

  // ---- My Work Tabs ----
  let myIssuesData = [];
  let reportedIssuesData = [];
  let activeTab = 'assigned';

  document.querySelectorAll('.my-work-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.my-work-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderMyWork();
    });
  });

  function renderMyWork() {
    const body = document.getElementById('my-work-body');
    const issues = activeTab === 'assigned' ? myIssuesData : reportedIssuesData;
    const countEl = document.getElementById('my-issues-count');
    const badgeEl = document.getElementById('my-work-count');
    if (activeTab === 'assigned') {
      if (countEl) countEl.textContent = myIssuesData.length;
      if (badgeEl) badgeEl.textContent = myIssuesData.length;
    }

    if (!issues.length) {
      body.innerHTML = `
        <div class="my-work-empty">
          <div class="my-work-empty-icon">${activeTab === 'assigned' ? '🎯' : '📝'}</div>
          <p>${activeTab === 'assigned' ? 'No issues assigned to you' : 'You haven\'t reported any issues'}</p>
        </div>`;
      return;
    }

    const statusOrder = { 'In Progress': 0, 'In Review': 1, 'To Do': 2, 'Done': 3 };
    const sorted = [...issues].sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4));

    body.innerHTML = sorted.map(issue => {
      const typeClass = { Bug: 'type-icon-bug', Task: 'type-icon-task', Story: 'type-icon-story', Epic: 'type-icon-epic' }[issue.type] || 'type-icon-task';
      const typeChar = { Bug: 'B', Task: 'T', Story: 'S', Epic: 'E' }[issue.type] || 'T';
      const statusBadge = {
        'To Do': '<span class="badge badge-todo">To Do</span>',
        'In Progress': '<span class="badge badge-in-progress">In Progress</span>',
        'In Review': '<span class="badge badge-in-review">In Review</span>',
        'Done': '<span class="badge badge-done">Done</span>',
      }[issue.status] || issue.status;
      const priorityIcon = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' }[issue.priority] || '';

      return `
        <a class="my-work-issue" href="/board.html?projectId=${issue.project?._id}&issueId=${issue._id}">
          <div class="my-work-issue-type">
            <div class="type-icon ${typeClass}" title="${issue.type}">${typeChar}</div>
          </div>
          <div class="my-work-issue-main">
            <div class="my-work-issue-title">${escapeHtml(issue.title)}</div>
            <div class="my-work-issue-meta">
              <span class="my-work-issue-key">${issue.project?.key || ''}-${issue.issueNumber || '?'}</span>
              <span class="my-work-issue-project">${escapeHtml(issue.project?.name || '')}</span>
              ${statusBadge}
              <span>${priorityIcon}</span>
            </div>
          </div>
        </a>`;
    }).join('');
  }

  // ---- Load projects into sidebar ----
  async function loadProjects() {
    try {
      const res = await api.get('/projects');
      const projects = res.data;

      document.getElementById('stat-projects').textContent = projects.length;
      document.getElementById('projects-count').textContent = projects.length;

      // Sidebar projects list
      const sidebarProjects = document.getElementById('sidebar-projects');
      if (projects.length) {
        sidebarProjects.innerHTML = projects.map(p => `
          <li><a href="/board.html?projectId=${p._id}">
            <span class="sidebar-nav-icon">📌</span> ${escapeHtml(p.name)}
          </a></li>`).join('');
      } else {
        sidebarProjects.innerHTML = `<li><a href="#" style="opacity:0.5"><span class="sidebar-nav-icon">—</span> No projects</a></li>`;
      }

      // Projects panel
      const projectsList = document.getElementById('projects-list');
      if (!projects.length) {
        projectsList.innerHTML = `
          <div class="empty-state" style="padding:32px">
            <div class="empty-state-icon">📋</div>
            <h3>No projects yet</h3>
            <p>Create your first project to get started</p>
          </div>`;
      } else {
        projectsList.innerHTML = projects.map(p => `
          <a class="project-list-item" href="/board.html?projectId=${p._id}">
            <div class="project-avatar">${p.key.slice(0,2)}</div>
            <div>
              <div class="project-list-name">${escapeHtml(p.name)}</div>
              <div class="project-list-key">${p.key}</div>
            </div>
            <span class="project-list-arrow">›</span>
          </a>`).join('');
      }

      return projects;
    } catch (err) {
      document.getElementById('projects-list').innerHTML = `<div class="empty-state" style="padding:24px"><p>Failed to load projects</p></div>`;
      return [];
    }
  }

  // ---- Load My Issues ----
  async function loadMyIssues() {
    try {
      const [assignedRes, reportedRes] = await Promise.all([
        api.get('/issues/my'),
        api.get('/issues/reported'),
      ]);
      myIssuesData = assignedRes.data;
      reportedIssuesData = reportedRes.data;

      // Quick stats from my assigned issues
      const todo = myIssuesData.filter(i => i.status === 'To Do').length;
      const progress = myIssuesData.filter(i => i.status === 'In Progress').length;
      const review = myIssuesData.filter(i => i.status === 'In Review').length;
      const done = myIssuesData.filter(i => i.status === 'Done').length;

      document.getElementById('stat-assigned').textContent = myIssuesData.length;
      document.getElementById('stat-done').textContent = done;
      document.getElementById('stat-inprogress').textContent = progress;

      document.getElementById('qs-todo').textContent = todo;
      document.getElementById('qs-progress').textContent = progress;
      document.getElementById('qs-review').textContent = review;
      document.getElementById('qs-done').textContent = done;

      // Priority breakdown from my issues
      const pCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      myIssuesData.forEach(i => { if (pCounts[i.priority] !== undefined) pCounts[i.priority]++; });
      document.getElementById('pq-critical').textContent = pCounts.Critical;
      document.getElementById('pq-high').textContent = pCounts.High;
      document.getElementById('pq-medium').textContent = pCounts.Medium;
      document.getElementById('pq-low').textContent = pCounts.Low;

      renderMyWork();
    } catch (err) {
      document.getElementById('my-work-body').innerHTML = `<div class="my-work-empty"><p>Failed to load issues</p></div>`;
    }
  }

  async function loadAll() {
    await Promise.all([loadProjects(), loadMyIssues()]);
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  loadAll();
})();
