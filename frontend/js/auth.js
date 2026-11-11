// Auth page logic
(function () {
  // If already logged in, redirect to dashboard
  if (localStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginError = document.getElementById('login-error');
  const registerError = document.getElementById('register-error');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');

  // Tab switching
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.remove('show');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span> Signing in...';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.add('show');
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign In';
    }
  });

  // Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.classList.remove('show');
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="spinner"></span> Creating account...';

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
      const data = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } catch (err) {
      registerError.textContent = err.message;
      registerError.classList.add('show');
      registerBtn.disabled = false;
      registerBtn.innerHTML = 'Create Account';
    }
  });
})();
