document.addEventListener('DOMContentLoaded', function() {
  // Check if admin is already logged in
  const token = localStorage.getItem('adminToken');
  if (token) {
    window.location.href = 'index.html';
  }
  
  // Initialize password toggle
  initPasswordToggle();
  
  // Handle login form submission
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
  }
});

function initPasswordToggle() {
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
      const input = this.parentElement.querySelector('input');
      const icon = this.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });
}

function handleAdminLogin(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const data = {
    email: formData.get('email'),
    password: formData.get('password')
  };
  
  // Disable form and show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  
  fetch('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => { throw err; });
    }
    return response.json();
  })
  .then(data => {
    // Save token and redirect
    localStorage.setItem('adminToken', data.token);
    window.location.href = 'index.html';
  })
  .catch(error => {
    console.error('Admin login error:', error);
    showToast(error.message || 'Login failed', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  });
}

function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Add to body
  document.body.appendChild(toast);
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}