// Board page logic — Jira-like Kanban with drawer + comments
(function () {
  if (!requireAuth()) return;

  const projectId = getParam('projectId');
  if (!projectId) { window.location.href = '/dashboard.html'; return; }

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Sidebar user info
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const sidebarName = document.getElementById('sidebar-name');
  const sidebarEmail = document.getElementById('sidebar-email');
  if (sidebarAvatar) sidebarAvatar.textContent = getInitials(currentUser.name);
  if (sidebarName) sidebarName.textContent = currentUser.name || 'User';
  if (sidebarEmail) sidebarEmail.textContent = currentUser.email || '';

  // Comment avatar
  const commentAvatar = document.getElementById('comment-avatar');
  if (commentAvatar) commentAvatar.textContent = getInitials(currentUser.name);

  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear(); window.location.href = '/index.html';
  });

  let allIssues = [];
  let allUsers = [];
  let project = null;
  let draggedIssueId = null;
  let currentIssue = null;
  let activeDrawerTab = 'details';

  const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  // ============================================================
  // INIT
  // ============================================================
  async function init() {
    try {
      const [projRes, usersRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get('/users'),
      ]);
      project = projRes.data;
      allUsers = usersRes.data;

      // Titles
      document.getElementById('project-name-topbar').textContent = project.name;
      document.getElementById('sidebar-project-name').textContent = project.name;
      document.title = `${project.name} Board — JiraSRU`;

      // Populate selects
      populateUserSelects();

      // Open issue from URL if ?issueId= present
      const urlIssueId = getParam('issueId');
      await loadIssues();
      if (urlIssueId) setTimeout(() => openDrawer(urlIssueId), 300);
    } catch (err) {
      showToast('Failed to load project: ' + err.message, 'error');
    }
  }

  function populateUserSelects() {
    const selects = ['filter-assignee', 'issue-assignee', 'drawer-assignee'];
    selects.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const isFilter = id === 'filter-assignee';
      sel.innerHTML = isFilter
        ? '<option value="">All Assignees</option><option value="__me__">👤 Assigned to me</option>'
        : '<option value="">Unassigned</option>';
      allUsers.forEach(u => {
        sel.innerHTML += `<option value="${u._id}">${u.name}</option>`;
      });
    });
  }

  async function loadIssues() {
    try {
      const res = await api.get(`/projects/${projectId}/issues`);
      allIssues = res.data;
      applyFilters();
    } catch (err) {
      showToast('Failed to load issues: ' + err.message, 'error');
    }
  }

  // ============================================================
  // BOARD RENDER
  // ============================================================
  function renderBoard(issues) {
    COLUMNS.forEach(col => {
      const colIssues = issues.filter(i => i.status === col);
      const colBody = document.querySelector(`[data-column="${col}"] .column-body`);
      const colCount = document.querySelector(`[data-column="${col}"] .column-count`);
      if (!colBody) return;

      colCount.textContent = colIssues.length;

      if (!colIssues.length) {
        colBody.innerHTML = `<div style="text-align:center;padding:20px 0;color:var(--text-muted);font-size:12px;">No issues</div>`;
      } else {
        colBody.innerHTML = colIssues.map(issue => renderIssueCard(issue)).join('');
      }

      colBody.querySelectorAll('.issue-card').forEach(card => {
        card.addEventListener('dragstart', onDragStart);
        card.addEventListener('dragend', onDragEnd);
        card.addEventListener('click', () => openDrawer(card.dataset.id));
      });
    });

    updateStats(issues);
  }

  function renderIssueCard(issue) {
    const typeChar = { Bug: 'B', Task: 'T', Story: 'S', Epic: 'E' }[issue.type] || 'T';
    const typeClass = { Bug: 'type-icon-bug', Task: 'type-icon-task', Story: 'type-icon-story', Epic: 'type-icon-epic' }[issue.type] || 'type-icon-task';
    const priorityIcon = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' }[issue.priority] || '';
    const assigneeEl = issue.assignee
      ? `<div class="assignee-avatar" title="${escapeHtml(issue.assignee.name)}">${getInitials(issue.assignee.name)}</div>`
      : `<div style="width:24px;height:24px;border-radius:50%;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text-muted);">+</div>`;

    const commentCount = issue.comments?.length || 0;
    const commentEl = commentCount > 0 ? `<span style="font-size:10px;color:var(--text-muted);">💬 ${commentCount}</span>` : '';

    return `
      <div class="issue-card" draggable="true" data-id="${issue._id}" data-type="${issue.type}">
        <div class="flex-center gap-8" style="margin-bottom:8px;justify-content:space-between;">
          <div class="type-icon ${typeClass}" title="${issue.type}">${typeChar}</div>
          <span style="font-size:11px;color:var(--text-muted);" title="Priority">${priorityIcon}</span>
        </div>
        <div class="issue-card-title">${escapeHtml(issue.title)}</div>
        <div class="issue-card-footer">
          <div class="flex-center gap-4">
            <span class="issue-number">${project?.key || ''}-${issue.issueNumber || '?'}</span>
            ${commentEl}
          </div>
          <div class="issue-card-right">${assigneeEl}</div>
        </div>
      </div>`;
  }

  function updateStats(issues) {
    document.getElementById('stat-total').textContent = issues.length;
    document.getElementById('stat-progress').textContent = issues.filter(i => i.status === 'In Progress').length;
    document.getElementById('stat-done').textContent = issues.filter(i => i.status === 'Done').length;
  }

  // ============================================================
  // DRAG & DROP
  // ============================================================
  function onDragStart(e) {
    draggedIssueId = e.currentTarget.dataset.id;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.column-body').forEach(c => c.classList.remove('drag-over'));
  }

  document.querySelectorAll('.board-column').forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.querySelector('.column-body').classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => {
      col.querySelector('.column-body').classList.remove('drag-over');
    });
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.querySelector('.column-body').classList.remove('drag-over');
      const newStatus = col.dataset.column;
      if (!draggedIssueId || !newStatus) return;

      const issue = allIssues.find(i => i._id === draggedIssueId);
      if (!issue || issue.status === newStatus) return;

      const prevStatus = issue.status;
      issue.status = newStatus;
      applyFilters();

      try {
        await api.put(`/issues/${draggedIssueId}`, { ...issue, status: newStatus });
        showToast(`Moved to "${newStatus}"`, 'success');
      } catch (err) {
        issue.status = prevStatus;
        applyFilters();
        showToast('Failed to update status', 'error');
      }
      draggedIssueId = null;
    });
  });

  // ============================================================
  // ISSUE DRAWER
  // ============================================================
  const drawerOverlay = document.getElementById('drawer-overlay');
  const issueDrawer = document.getElementById('issue-drawer');

  async function openDrawer(issueId) {
    try {
      const res = await api.get(`/issues/${issueId}`);
      currentIssue = res.data;
      populateDrawer(currentIssue);
      issueDrawer.classList.add('active');
      drawerOverlay.classList.add('active');
      switchDrawerTab('details');
    } catch (err) {
      showToast('Failed to load issue', 'error');
    }
  }

  function closeDrawer() {
    issueDrawer.classList.remove('active');
    drawerOverlay.classList.remove('active');
    currentIssue = null;
  }

  drawerOverlay.addEventListener('click', closeDrawer);
  document.getElementById('close-drawer').addEventListener('click', closeDrawer);

  function populateDrawer(issue) {
    document.getElementById('drawer-title').value = issue.title;
    document.getElementById('drawer-description').value = issue.description || '';
    document.getElementById('drawer-issue-key').textContent = `${issue.project?.key || project?.key}-${issue.issueNumber}`;
    document.getElementById('drawer-project-name').textContent = issue.project?.name || project?.name;
    document.getElementById('drawer-status').value = issue.status;
    document.getElementById('drawer-priority').value = issue.priority;
    document.getElementById('drawer-type').value = issue.type;
    document.getElementById('drawer-due').value = issue.dueDate ? issue.dueDate.slice(0, 10) : '';
    document.getElementById('drawer-created').textContent = formatDate(issue.createdAt);
    document.getElementById('drawer-updated').textContent = formatDate(issue.updatedAt);

    const reporterName = issue.reporter?.name || '—';
    document.getElementById('drawer-reporter-avatar').textContent = getInitials(reporterName);
    document.getElementById('drawer-reporter-name').textContent = reporterName;

    // Assignee select
    const assigneeSel = document.getElementById('drawer-assignee');
    assigneeSel.innerHTML = '<option value="">Unassigned</option>';
    allUsers.forEach(u => {
      assigneeSel.innerHTML += `<option value="${u._id}" ${issue.assignee?._id === u._id ? 'selected' : ''}>${u.name}</option>`;
    });

    // Comments
    renderComments(issue.comments || []);

    // Activity
    renderActivity(issue);
  }

  // Drawer Tabs
  function switchDrawerTab(tab) {
    activeDrawerTab = tab;
    document.querySelectorAll('.drawer-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('tab-details').classList.toggle('hidden', tab !== 'details');
    document.getElementById('tab-comments').classList.toggle('hidden', tab !== 'comments');
    document.getElementById('tab-activity').classList.toggle('hidden', tab !== 'activity');
  }

  document.querySelectorAll('.drawer-tab').forEach(tab => {
    tab.addEventListener('click', () => switchDrawerTab(tab.dataset.tab));
  });

  // Save issue
  document.getElementById('save-issue-btn').addEventListener('click', async () => {
    if (!currentIssue) return;
    const btn = document.getElementById('save-issue-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      const updated = await api.put(`/issues/${currentIssue._id}`, {
        title: document.getElementById('drawer-title').value,
        description: document.getElementById('drawer-description').value,
        status: document.getElementById('drawer-status').value,
        assignee: document.getElementById('drawer-assignee').value || null,
        priority: document.getElementById('drawer-priority').value,
        type: document.getElementById('drawer-type').value,
        dueDate: document.getElementById('drawer-due').value || null,
      });
      currentIssue = updated.data;
      allIssues = allIssues.map(i => i._id === currentIssue._id ? currentIssue : i);
      populateDrawer(currentIssue);
      applyFilters();
      showToast('Issue saved!', 'success');
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Save';
    }
  });

  // Delete issue
  document.getElementById('delete-issue-btn').addEventListener('click', async () => {
    if (!currentIssue || !confirm(`Delete "${currentIssue.title}"?`)) return;
    try {
      await api.delete(`/issues/${currentIssue._id}`);
      allIssues = allIssues.filter(i => i._id !== currentIssue._id);
      closeDrawer();
      applyFilters();
      showToast('Issue deleted', 'success');
    } catch (err) {
      showToast('Failed to delete issue', 'error');
    }
  });

  // ============================================================
  // COMMENTS
  // ============================================================
  function renderComments(comments) {
    const list = document.getElementById('comments-list');
    const badge = document.getElementById('comment-count-badge');
    badge.textContent = comments.length;

    if (!comments.length) {
      list.innerHTML = `<div class="text-muted text-sm" style="padding:8px 0;">No comments yet. Be the first to comment!</div>`;
      return;
    }

    list.innerHTML = comments.map(c => {
      const isOwn = c.author?._id === currentUser._id || c.author === currentUser._id;
      return `
        <div class="comment-item" data-comment-id="${c._id}">
          <div class="assignee-avatar">${getInitials(c.author?.name || '?')}</div>
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-author">${escapeHtml(c.author?.name || 'Unknown')}</span>
              <span class="comment-time">${formatDate(c.createdAt)}</span>
              ${isOwn ? `<button class="comment-delete" data-id="${c._id}">🗑 Delete</button>` : ''}
            </div>
            <div class="comment-text">${escapeHtml(c.text)}</div>
          </div>
        </div>`;
    }).join('');

    // Bind delete buttons
    list.querySelectorAll('.comment-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteComment(btn.dataset.id));
    });
  }

  document.getElementById('submit-comment').addEventListener('click', submitComment);
  document.getElementById('comment-text').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); submitComment(); }
  });
  document.getElementById('cancel-comment').addEventListener('click', () => {
    document.getElementById('comment-text').value = '';
  });

  async function submitComment() {
    const text = document.getElementById('comment-text').value.trim();
    if (!text || !currentIssue) return;
    const btn = document.getElementById('submit-comment');
    btn.disabled = true;
    try {
      await api.post(`/issues/${currentIssue._id}/comments`, { text });
      document.getElementById('comment-text').value = '';
      // Reload issue to get populated comment
      const res = await api.get(`/issues/${currentIssue._id}`);
      currentIssue = res.data;
      renderComments(currentIssue.comments || []);
      // Update card comment count
      allIssues = allIssues.map(i => i._id === currentIssue._id ? { ...i, comments: currentIssue.comments } : i);
      applyFilters();
      showToast('Comment added!', 'success');
    } catch (err) {
      showToast('Failed to add comment', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function deleteComment(commentId) {
    if (!confirm('Delete this comment?')) return;
    try {
      await api.delete(`/issues/${currentIssue._id}/comments/${commentId}`);
      currentIssue.comments = currentIssue.comments.filter(c => c._id !== commentId);
      renderComments(currentIssue.comments);
      showToast('Comment deleted', 'success');
    } catch (err) {
      showToast('Failed to delete comment', 'error');
    }
  }

  // ============================================================
  // ACTIVITY
  // ============================================================
  function renderActivity(issue) {
    const list = document.getElementById('activity-list');
    const events = [
      { icon: '✨', text: `Issue created by <strong>${escapeHtml(issue.reporter?.name || 'Unknown')}</strong>`, time: issue.createdAt },
      ...(issue.comments || []).map(c => ({
        icon: '💬',
        text: `<strong>${escapeHtml(c.author?.name || 'Unknown')}</strong> commented`,
        time: c.createdAt,
      })),
    ].sort((a, b) => new Date(a.time) - new Date(b.time));

    list.innerHTML = events.map(e => `
      <div class="activity-item">
        <span>${e.icon}</span>
        <span>${e.text}</span>
        <span class="text-muted text-xs" style="margin-left:auto;">${formatDate(e.time)}</span>
      </div>`).join('');
  }

  // ============================================================
  // CREATE ISSUE MODAL
  // ============================================================
  const createModal = document.getElementById('create-issue-modal');
  const createForm = document.getElementById('create-issue-form');
  const createBtn = document.getElementById('create-issue-btn');

  function openCreateModal(defaultStatus = 'To Do') {
    document.getElementById('issue-status').value = defaultStatus;
    createModal.classList.add('active');
  }
  function closeCreateModal() { createModal.classList.remove('active'); createForm.reset(); }

  document.getElementById('open-create-issue').addEventListener('click', () => openCreateModal());
  document.getElementById('close-create-issue').addEventListener('click', closeCreateModal);
  document.getElementById('cancel-create-issue').addEventListener('click', closeCreateModal);
  createModal.addEventListener('click', (e) => { if (e.target === createModal) closeCreateModal(); });

  // "Add issue" buttons in columns
  document.querySelectorAll('.column-add-btn').forEach(btn => {
    btn.addEventListener('click', () => openCreateModal(btn.dataset.status));
  });

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="spinner"></span> Creating...';

    try {
      const issue = await api.post(`/projects/${projectId}/issues`, {
        title: document.getElementById('issue-title').value,
        description: document.getElementById('issue-description').value,
        type: document.getElementById('issue-type').value,
        priority: document.getElementById('issue-priority').value,
        status: document.getElementById('issue-status').value,
        assignee: document.getElementById('issue-assignee').value || null,
        dueDate: document.getElementById('issue-due').value || null,
      });
      closeCreateModal();
      showToast('Issue created!', 'success');
      await loadIssues();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      createBtn.disabled = false;
      createBtn.innerHTML = 'Create Issue';
    }
  });

  // ============================================================
  // FILTERS
  // ============================================================
  function applyFilters() {
    const type = document.getElementById('filter-type').value;
    const priority = document.getElementById('filter-priority').value;
    const assigneeFilter = document.getElementById('filter-assignee').value;
    const search = document.getElementById('search-issues').value.toLowerCase();

    const filtered = allIssues.filter(i => {
      const matchType = !type || i.type === type;
      const matchPriority = !priority || i.priority === priority;
      const matchAssignee = !assigneeFilter
        ? true
        : assigneeFilter === '__me__'
          ? i.assignee?._id === currentUser._id || i.assignee === currentUser._id
          : i.assignee?._id === assigneeFilter;
      const matchSearch = !search || i.title.toLowerCase().includes(search);
      return matchType && matchPriority && matchAssignee && matchSearch;
    });

    renderBoard(filtered);
  }

  ['filter-type', 'filter-priority', 'filter-assignee'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });
  document.getElementById('search-issues')?.addEventListener('input', applyFilters);

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (issueDrawer.classList.contains('active')) closeDrawer();
      if (createModal.classList.contains('active')) closeCreateModal();
    }
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
      openCreateModal();
    }
  });

  init();
})();
