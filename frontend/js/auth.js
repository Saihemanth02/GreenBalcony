// GreenBalcony — Authentication Handlers
import { loginUser, registerUser } from './api.js';

// Password Strength Evaluator
function checkPasswordStrength(password) {
  let score = 0;
  if (!password) return { score, label: 'Too Weak', color: 'var(--status-error)' };

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let label = 'Too Weak';
  let color = 'var(--status-error)';

  if (score === 2) {
    label = 'Weak';
    color = '#f59e0b';
  } else if (score === 3) {
    label = 'Medium';
    color = '#3b82f6';
  } else if (score === 4) {
    label = 'Strong';
    color = 'var(--status-success)';
  }

  return { score, label, color };
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Redirect if token already present
  const token = localStorage.getItem('token');
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  if (token && (currentPath === 'login.html' || currentPath === 'register.html')) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'Admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'dashboard.html';
    }
    return;
  }

  // 2. Login Form Handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit-btn');
    const togglePassword = document.getElementById('toggle-password-view');
    const rememberMe = document.getElementById('login-remember');

    // Toggle Password Visibility
    if (togglePassword) {
      togglePassword.onclick = () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.textContent = type === 'password' ? '👁' : '🙈';
      };
    }

    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showToast('Please enter both email and password.', 'warning');
        return;
      }

      setButtonLoading(submitBtn, true, 'Logging in...');

      try {
        const res = await loginUser(email, password);
        if (res.success && res.data) {
          showToast('Login successful!', 'success');
          
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));

          // If remember me is NOT checked, we store in session instead or keep it simple.
          // The prompt says: "Remember me checkbox (extends token storage to localStorage vs sessionStorage)"
          if (!rememberMe || !rememberMe.checked) {
            // Default behavior is to keep it, but let's implement the prompt's request
            // We can clear token on tab close by copying to sessionStorage, but let's just follow standard
            // session vs local logic. If rememberMe is checked, keep in localStorage. Else, copy to sessionStorage and remove from localStorage?
            // Actually, a simpler way: if rememberMe is unchecked, we can remove it when session ends, or just do a standard check.
            // Let's store in localStorage anyway but set a flag, or store in sessionStorage if not checked!
            // Yes! "Remember me checkbox (extends token storage to localStorage vs sessionStorage)"
            if (!rememberMe.checked) {
              sessionStorage.setItem('token', res.data.token);
              sessionStorage.setItem('user', JSON.stringify(res.data.user));
              localStorage.removeItem('token'); // clear from local
              localStorage.removeItem('user');
            }
          }

          // Role-based redirect
          setTimeout(() => {
            if (res.data.user.role === 'Admin') {
              window.location.href = 'admin.html';
            } else {
              window.location.href = 'dashboard.html';
            }
          }, 800);
        }
      } catch (err) {
        showToast(err.message || 'Login failed. Please check your credentials.', 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    };
  }

  // 3. Register Form Handler
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const phoneInput = document.getElementById('register-phone');
    const passwordInput = document.getElementById('register-password');
    const confirmInput = document.getElementById('register-confirm');
    const addressInput = document.getElementById('register-address');
    const cityInput = document.getElementById('register-city');
    const pincodeInput = document.getElementById('register-pincode');
    const submitBtn = document.getElementById('register-submit-btn');
    
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    // Password strength change listener
    if (passwordInput && strengthBar && strengthText) {
      passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const evaluation = checkPasswordStrength(password);
        
        strengthText.textContent = `Strength: ${evaluation.label}`;
        strengthText.style.color = evaluation.color;
        
        // Adjust width based on score
        const widthPercent = (evaluation.score / 4) * 100;
        strengthBar.style.width = `${widthPercent}%`;
        strengthBar.style.backgroundColor = evaluation.color;
      });
    }

    registerForm.onsubmit = async (e) => {
      e.preventDefault();

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();
      const password = passwordInput.value;
      const confirm = confirmInput.value;
      const address = addressInput.value.trim();
      const city = cityInput.value.trim();
      const pincode = pincodeInput.value.trim();

      // Front-end validations
      if (!name || !email || !phone || !password || !confirm) {
        showToast('Please fill out all required fields.', 'warning');
        return;
      }

      if (password !== confirm) {
        showToast('Passwords do not match.', 'error');
        return;
      }

      const strength = checkPasswordStrength(password);
      if (strength.score < 2) {
        showToast('Password is too weak. Please choose a stronger password.', 'warning');
        return;
      }

      setButtonLoading(submitBtn, true, 'Creating Account...');

      const payload = {
        name,
        email,
        phone,
        password,
        address,
        city,
        pincode
      };

      try {
        const res = await registerUser(payload);
        if (res.success && res.data) {
          showToast('Account created successfully!', 'success');
          
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);
        }
      } catch (err) {
        showToast(err.message || 'Registration failed. Try again.', 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    };
  }
});
