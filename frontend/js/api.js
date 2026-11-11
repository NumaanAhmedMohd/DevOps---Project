// =============================================
// API Client Helper — works with local backend or Docker
// =============================================

// Auto-detect: if frontend is on port 3000 served by serve/live-server,
// API is on localhost:5000. If served by Nginx (Docker), use /api.
const isLocalDev = window.location.port === '3000' || window.location.port === '5500' || window.location.port === '5173';
const BASE_URL = isLocalDev ? 'http://localhost:5000/api' : '/api';

const api = {
  getToken() {
    return localStorage.getItem('token');
  },

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  async request(method, endpoint, body = null) {
    const options = { method, headers: this.getHeaders() };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  },

  get(endpoint) { return this.request('GET', endpoint); },
  post(endpoint, body) { return this.request('POST', endpoint, body); },
  put(endpoint, body) { return this.request('PUT', endpoint, body); },
  delete(endpoint) { return this.request('DELETE', endpoint); },
};

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  div.className = 'toast-container';
  document.body.appendChild(div);
  return div;
}

// Redirect if not authenticated
function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/index.html'; return false; }
  return true;
}

// Get query param
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get initials from name
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Priority / type badge classes
const TYPE_CLASS = { Bug: 'badge-bug', Task: 'badge-task', Story: 'badge-story', Epic: 'badge-epic' };
const PRIORITY_CLASS = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
const PRIORITY_ICON = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' };
const TYPE_ICON = { Bug: '🐛', Task: '✅', Story: '📖', Epic: '⚡' };
