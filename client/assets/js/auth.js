document.addEventListener('DOMContentLoaded', function () {
  // Initialize all auth pages
  initAuthPages();

  // Setup event listeners
  setupAuthEventListeners();

  // Initialize Country/State dropdowns (India only)
  initLocationSelectors();
});

/* ===========================
   AUTH PAGE INITIALIZERS
=========================== */
function initAuthPages() {
  // Redirect if token exists and user is on auth page
  const token = localStorage.getItem('token');
  if (token && window.location.pathname.includes('auth')) {
    window.location.href = '../dashboard/home.html';
  }

  initPasswordToggle();
  initFileUpload();
  initPasswordStrength();
  initFormValidation();
}

function setupAuthEventListeners() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const registerForm = document.getElementById('register-form');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  const forgotPasswordForm = document.getElementById('forgot-password-form');
  if (forgotPasswordForm)
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
}

/* ===========================
   PASSWORD TOGGLE
=========================== */
function initPasswordToggle() {
  document.querySelectorAll('.toggle-password').forEach((button) => {
    button.addEventListener('click', function () {
      const input = this.parentElement.querySelector('input');
      const icon = this.querySelector('i');

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
      }
    });
  });
}

/* ===========================
   FILE UPLOAD DISPLAY
=========================== */
function initFileUpload() {
  document.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', function () {
      const fileName = this.files[0] ? this.files[0].name : 'No file chosen';
      this.parentElement.querySelector('.file-name').textContent = fileName;
    });
  });
}

/* ===========================
   PASSWORD STRENGTH METER
=========================== */
function initPasswordStrength() {
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      const strengthBar = document.querySelector('.strength-bar');
      const strengthText = document.querySelector('.strength-text');
      const password = this.value;

      strengthBar.parentElement.className = 'password-strength';

      if (!password) return;

      if (password.length < 6) {
        strengthBar.parentElement.classList.add('weak');
        strengthText.textContent = 'Weak';
      } else if (password.length < 10) {
        strengthBar.parentElement.classList.add('medium');
        strengthText.textContent = 'Medium';
      } else {
        strengthBar.parentElement.classList.add('strong');
        strengthText.textContent = 'Strong';
      }
    });
  }
}

/* ===========================
   LOCATION SELECTORS (India only)
=========================== */
// Change after IMP
// function initLocationSelectors() {
//   const countrySelect = document.getElementById('country');
//   const stateSelect = document.getElementById('state');

//   if (!countrySelect || !stateSelect) return;

//   // Set Country dropdown to India only
//   countrySelect.innerHTML = '';
//   const indiaOption = document.createElement('option');
//   indiaOption.value = 'IN'; // ISO code for India
//   indiaOption.textContent = 'India';
//   countrySelect.appendChild(indiaOption);

//   // Preload states immediately for India
//   loadStatesForIndia();

//   async function loadStatesForIndia() {
//     stateSelect.innerHTML = '<option value="">Loading states...</option>';
//     try {
//       const res = await fetch('/api/locations/states?country=IN');
//       const states = await res.json();

//       stateSelect.innerHTML = '<option value="">Select State</option>';
//       if (states.length > 0) {
//         states.forEach(state => {
//           const option = document.createElement('option');
//           option.value = state.isoCode || state.name;
//           option.textContent = state.name;
//           stateSelect.appendChild(option);
//         });
//       } else {
//         stateSelect.innerHTML = '<option value="">No states available</option>';
//       }
//       stateSelect.disabled = false;
//     } catch (err) {
//       console.error('Error loading states:', err);
//       stateSelect.innerHTML = '<option value="">Error loading states</option>';
//       stateSelect.disabled = true;
//     }
//   }
// }

function initLocationSelectors() {
  const countrySelect = document.getElementById('country');
  const stateSelect = document.getElementById('state');

  if (!countrySelect || !stateSelect) return;

  // Force country to India
  countrySelect.innerHTML = '';
  const indiaOption = document.createElement('option');
  indiaOption.value = 'IN';
  indiaOption.textContent = 'India';
  countrySelect.appendChild(indiaOption);

  // Force state to Hyderabad
  stateSelect.innerHTML = '';
  const hyderabadOption = document.createElement('option');
  hyderabadOption.value = 'Hyderabad';
  hyderabadOption.textContent = 'Hyderabad';
  stateSelect.appendChild(hyderabadOption);
  stateSelect.disabled = false;
}


/* ===========================
   FORM VALIDATION
=========================== */
function initFormValidation() {
  const usernameInput = document.getElementById('username');
  if (usernameInput) {
    usernameInput.addEventListener('blur', function () {
      const username = this.value.trim();
      const validationMsg = document.getElementById('username-validation');

      if (username.length < 3) {
        validationMsg.textContent = 'Username must be at least 3 characters';
        return;
      }

      fetch(`/api/auth/check-username?username=${username}`)
        .then((res) => res.json())
        .then((data) => {
          validationMsg.textContent = data.available
            ? ''
            : 'Username is already taken';
        });
    });
  }

  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('blur', function () {
      const email = this.value.trim();
      const validationMsg = document.getElementById('email-validation');

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        validationMsg.textContent = 'Please enter a valid email';
        return;
      }

      fetch(`/api/auth/check-email?email=${email}`)
        .then((res) => res.json())
        .then((data) => {
          validationMsg.textContent = data.available
            ? ''
            : 'Email is already registered';
        });
    });
  }

  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  if (passwordInput && confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', function () {
      const validationMsg = document.getElementById('password-validation');
      validationMsg.textContent =
        this.value !== passwordInput.value ? 'Passwords do not match' : '';
    });
  }
}

/* ===========================
   FORM HANDLERS
=========================== */
function handleLogin(e) {
  e.preventDefault();
  const data = {
    emailOrUsername: e.target.emailOrUsername.value,
    password: e.target.password.value,
  };

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then((res) =>
      res.ok ? res.json() : res.json().then((err) => Promise.reject(err))
    )
    .then((data) => {
      localStorage.setItem('token', data.token);
      window.location.href = '../dashboard/home.html';
    })
    .catch((err) => showToast(err.message || 'Login failed', 'error'));
}
 
// handle registerform
function handleRegister(e) {

  e.preventDefault();
  console.log('Register submit fired!');
  // ...rest of your code

  e.preventDefault();
  const formData = new FormData(e.target);

  if (formData.get('password') !== formData.get('confirmPassword')) {
    showToast('Passwords do not match', 'error');
    return;
  }

  fetch('/api/auth/register', {
    method: 'POST',
    body: formData,
  })
    .then((res) =>
      res.ok ? res.json() : res.json().then((err) => Promise.reject(err))
    )
    .then(() => {
      showToast('Registration successful! Please login', 'success');
      setTimeout(() => (window.location.href = 'login.html'), 1500);
    })
    .catch((err) => showToast(err.message || 'Registration failed', 'error'));
}

function handleForgotPassword(e) {
  e.preventDefault();
  const data = {
    email: e.target.email.value,
    phone: e.target.phone.value,
  };

  fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then((res) =>
      res.ok ? res.json() : res.json().then((err) => Promise.reject(err))
    )
    .then(() =>
      showToast(
        'If your email and phone match our records, you will receive a reset link',
        'success'
      )
    )
    .catch((err) => showToast(err.message || 'Password reset failed', 'error'));
}

/* ===========================
   TOAST UTILITY
=========================== */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}









// document.addEventListener('DOMContentLoaded', function () {
//   // Initialize all auth pages
//   initAuthPages();

//   // Setup event listeners
//   setupAuthEventListeners();

//   // Initialize Country/State dropdowns
//   initLocationSelectors(); // Our improved merged version
// });

// /* ===========================
//    AUTH PAGE INITIALIZERS
// =========================== */
// function initAuthPages() {
//   // Check if user is already logged in
//   const token = localStorage.getItem('token');
//   if (token && window.location.pathname.includes('auth')) {
//     window.location.href = '../dashboard/home.html';
//   }

//   initPasswordToggle();
//   initFileUpload();
//   initPasswordStrength();
//   initFormValidation();
// }

// function setupAuthEventListeners() {
//   const loginForm = document.getElementById('login-form');
//   if (loginForm) loginForm.addEventListener('submit', handleLogin);

//   const registerForm = document.getElementById('register-form');
//   if (registerForm) registerForm.addEventListener('submit', handleRegister);

//   const forgotPasswordForm = document.getElementById('forgot-password-form');
//   if (forgotPasswordForm)
//     forgotPasswordForm.addEventListener('submit', handleForgotPassword);
// }

// /* ===========================
//    PASSWORD TOGGLE
// =========================== */
// function initPasswordToggle() {
//   document.querySelectorAll('.toggle-password').forEach((button) => {
//     button.addEventListener('click', function () {
//       const input = this.parentElement.querySelector('input');
//       const icon = this.querySelector('i');

//       if (input.type === 'password') {
//         input.type = 'text';
//         icon.classList.replace('fa-eye', 'fa-eye-slash');
//       } else {
//         input.type = 'password';
//         icon.classList.replace('fa-eye-slash', 'fa-eye');
//       }
//     });
//   });
// }

// /* ===========================
//    FILE UPLOAD DISPLAY
// =========================== */
// function initFileUpload() {
//   document.querySelectorAll('input[type="file"]').forEach((input) => {
//     input.addEventListener('change', function () {
//       const fileName = this.files[0] ? this.files[0].name : 'No file chosen';
//       this.parentElement.querySelector('.file-name').textContent = fileName;
//     });
//   });
// }

// /* ===========================
//    PASSWORD STRENGTH METER
// =========================== */
// function initPasswordStrength() {
//   const passwordInput = document.getElementById('password');
//   if (passwordInput) {
//     passwordInput.addEventListener('input', function () {
//       const strengthBar = document.querySelector('.strength-bar');
//       const strengthText = document.querySelector('.strength-text');
//       const password = this.value;

//       strengthBar.parentElement.className = 'password-strength';

//       if (!password) return;

//       if (password.length < 6) {
//         strengthBar.parentElement.classList.add('weak');
//         strengthText.textContent = 'Weak';
//       } else if (password.length < 10) {
//         strengthBar.parentElement.classList.add('medium');
//         strengthText.textContent = 'Medium';
//       } else {
//         strengthBar.parentElement.classList.add('strong');
//         strengthText.textContent = 'Strong';
//       }
//     });
//   }
// }

// /* ===========================
//    LOCATION SELECTORS (MERGED)
// =========================== */
// function initLocationSelectors() {
//   const countrySelect = document.getElementById('country');
//   const stateSelect = document.getElementById('state');

//   if (!countrySelect || !stateSelect) return;

//   loadCountries();

//   countrySelect.addEventListener('change', function () {
//     if (this.value) {
//       loadStates(this.value);
//       stateSelect.disabled = false;
//     } else {
//       stateSelect.innerHTML = '<option value="">Select State</option>';
//       stateSelect.disabled = true;
//     }
//   });

//   async function loadCountries() {
//     try {
//       const response = await fetch('https://restcountries.com/v3.1/all');
//       const countries = await response.json();
//       countries.sort((a, b) => a.name.common.localeCompare(b.name.common));

//       countries.forEach((country) => {
//         const option = document.createElement('option');
//         option.value = country.cca2;
//         option.textContent = country.name.common;
//         countrySelect.appendChild(option);
//       });
//     } catch (error) {
//       console.error('Error loading countries:', error);
//       loadStaticCountries();
//     }
//   }

//   async function loadStates(countryCode) {
//     stateSelect.innerHTML = '<option value="">Loading states...</option>';
//     try {
//       const response = await fetch(
//         `/api/locations/states?country=${countryCode}`
//       );
//       const states = await response.json();

//       stateSelect.innerHTML = '<option value="">Select State</option>';

//       if (states.length > 0) {
//         states.forEach((state) => {
//           const option = document.createElement('option');
//           option.value = state.isoCode || state.name;
//           option.textContent = state.name;
//           stateSelect.appendChild(option);
//         });
//       } else {
//         stateSelect.innerHTML = '<option value="">No states available</option>';
//         stateSelect.disabled = false;
//       }
//     } catch (error) {
//       console.error('Error loading states:', error);
//       stateSelect.innerHTML = '<option value="">Error loading states</option>';
//     }
//   }

//   function loadStaticCountries() {
//     const countries = [
//       { code: 'US', name: 'United States' },
//       { code: 'IN', name: 'India' },
//       { code: 'GB', name: 'United Kingdom' },
//     ];
//     countries.forEach((country) => {
//       const option = document.createElement('option');
//       option.value = country.code;
//       option.textContent = country.name;
//       countrySelect.appendChild(option);
//     });
//   }
// }

// /* ===========================
//    FORM VALIDATION
// =========================== */
// function initFormValidation() {
//   const usernameInput = document.getElementById('username');
//   if (usernameInput) {
//     usernameInput.addEventListener('blur', function () {
//       const username = this.value.trim();
//       const validationMsg = document.getElementById('username-validation');

//       if (username.length < 3) {
//         validationMsg.textContent = 'Username must be at least 3 characters';
//         return;
//       }

//       fetch(`/api/auth/check-username?username=${username}`)
//         .then((res) => res.json())
//         .then((data) => {
//           validationMsg.textContent = data.available
//             ? ''
//             : 'Username is already taken';
//         });
//     });
//   }

//   const emailInput = document.getElementById('email');
//   if (emailInput) {
//     emailInput.addEventListener('blur', function () {
//       const email = this.value.trim();
//       const validationMsg = document.getElementById('email-validation');

//       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//         validationMsg.textContent = 'Please enter a valid email';
//         return;
//       }

//       fetch(`/api/auth/check-email?email=${email}`)
//         .then((res) => res.json())
//         .then((data) => {
//           validationMsg.textContent = data.available
//             ? ''
//             : 'Email is already registered';
//         });
//     });
//   }

//   const passwordInput = document.getElementById('password');
//   const confirmPasswordInput = document.getElementById('confirmPassword');
//   if (passwordInput && confirmPasswordInput) {
//     confirmPasswordInput.addEventListener('input', function () {
//       const validationMsg = document.getElementById('password-validation');
//       validationMsg.textContent =
//         this.value !== passwordInput.value ? 'Passwords do not match' : '';
//     });
//   }
// }

// /* ===========================
//    FORM HANDLERS
// =========================== */
// function handleLogin(e) {
//   e.preventDefault();
//   const data = {
//     emailOrUsername: e.target.emailOrUsername.value,
//     password: e.target.password.value,
//   };

//   fetch('/api/auth/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   })
//     .then((r) => (r.ok ? r.json() : r.json().then((err) => Promise.reject(err))))
//     .then((data) => {
//       localStorage.setItem('token', data.token);
//       window.location.href = '../dashboard/home.html';
//     })
//     .catch((err) => showToast(err.message || 'Login failed', 'error'));
// }

// function handleRegister(e) {
//   e.preventDefault();
//   const formData = new FormData(e.target);

//   if (formData.get('password') !== formData.get('confirmPassword')) {
//     showToast('Passwords do not match', 'error');
//     return;
//   }

//   fetch('/api/auth/register', {
//     method: 'POST',
//     body: formData,
//   })
//     .then((r) => (r.ok ? r.json() : r.json().then((err) => Promise.reject(err))))
//     .then(() => {
//       showToast('Registration successful! Please login', 'success');
//       setTimeout(() => (window.location.href = 'login.html'), 1500);
//     })
//     .catch((err) => showToast(err.message || 'Registration failed', 'error'));
// }

// function handleForgotPassword(e) {
//   e.preventDefault();
//   const data = {
//     email: e.target.email.value,
//     phone: e.target.phone.value,
//   };

//   fetch('/api/auth/forgot-password', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   })
//     .then((r) => (r.ok ? r.json() : r.json().then((err) => Promise.reject(err))))
//     .then(() =>
//       showToast(
//         'If your email and phone match our records, you will receive a reset link',
//         'success'
//       )
//     )
//     .catch((err) => showToast(err.message || 'Password reset failed', 'error'));
// }

// /* ===========================
//    TOAST UTILITY
// =========================== */
// function showToast(message, type = 'info') {
//   const toast = document.createElement('div');
//   toast.className = `toast toast-${type}`;
//   toast.textContent = message;
//   document.body.appendChild(toast);
//   setTimeout(() => {
//     toast.classList.add('fade-out');
//     setTimeout(() => toast.remove(), 300);
//   }, 3000);
// }

















// // document.addEventListener('DOMContentLoaded', function() {
// //   // Initialize all auth pages
// //   initAuthPages();
  
// //   // Setup event listeners
// //   setupAuthEventListeners();

  
// // });

// // function initAuthPages() {
// //   // Check if user is already logged in
// //   const token = localStorage.getItem('token');
// //   if (token && window.location.pathname.includes('auth')) {
// //     window.location.href = '../dashboard/home.html';
// //   }
  
// //   // Initialize password toggle
// //   initPasswordToggle();
  
// //   // Initialize file upload display
// //   initFileUpload();
  
// //   // Initialize password strength meter
// //   initPasswordStrength();
  
// //   // Initialize location selectors
// //   initLocationSelectors();
  
// //   // Initialize form validation
// //   initFormValidation();
// // }

// // function setupAuthEventListeners() {
// //   // Login form submission
// //   const loginForm = document.getElementById('login-form');
// //   if (loginForm) {
// //     loginForm.addEventListener('submit', handleLogin);
// //   }
  
// //   // Register form submission
// //   const registerForm = document.getElementById('register-form');
// //   if (registerForm) {
// //     registerForm.addEventListener('submit', handleRegister);
// //   }
  
// //   // Forgot password form submission
// //   const forgotPasswordForm = document.getElementById('forgot-password-form');
// //   if (forgotPasswordForm) {
// //     forgotPasswordForm.addEventListener('submit', handleForgotPassword);
// //   }
// // }

// // function initPasswordToggle() {
// //   document.querySelectorAll('.toggle-password').forEach(button => {
// //     button.addEventListener('click', function() {
// //       const input = this.parentElement.querySelector('input');
// //       const icon = this.querySelector('i');
      
// //       if (input.type === 'password') {
// //         input.type = 'text';
// //         icon.classList.remove('fa-eye');
// //         icon.classList.add('fa-eye-slash');
// //       } else {
// //         input.type = 'password';
// //         icon.classList.remove('fa-eye-slash');
// //         icon.classList.add('fa-eye');
// //       }
// //     });
// //   });
// // }

// // function initFileUpload() {
// //   const fileInputs = document.querySelectorAll('input[type="file"]');
// //   fileInputs.forEach(input => {
// //     input.addEventListener('change', function() {
// //       const fileName = this.files[0] ? this.files[0].name : 'No file chosen';
// //       this.parentElement.querySelector('.file-name').textContent = fileName;
// //     });
// //   });
// // }

// // function initPasswordStrength() {
// //   const passwordInput = document.getElementById('password');
// //   if (passwordInput) {
// //     passwordInput.addEventListener('input', function() {
// //       const strengthBar = document.querySelector('.strength-bar');
// //       const strengthText = document.querySelector('.strength-text');
// //       const password = this.value;
      
// //       // Reset classes
// //       strengthBar.parentElement.className = 'password-strength';
      
// //       if (password.length === 0) {
// //         return;
// //       } else if (password.length < 6) {
// //         strengthBar.parentElement.classList.add('weak');
// //         strengthText.textContent = 'Weak';
// //       } else if (password.length < 10) {
// //         strengthBar.parentElement.classList.add('medium');
// //         strengthText.textContent = 'Medium';
// //       } else {
// //         strengthBar.parentElement.classList.add('strong');
// //         strengthText.textContent = 'Strong';
// //       }
// //     });
// //   }
// // }

// // function initLocationSelectors() {
// //   // Load countries
// //   const countrySelect = document.getElementById('country');
// //   if (countrySelect) {
// //     fetch('https://restcountries.com/v3.1/all')
// //       .then(response => response.json())
// //       .then(countries => {
// //         countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        
// //         countries.forEach(country => {
// //           const option = document.createElement('option');
// //           option.value = country.name.common;
// //           option.textContent = country.name.common;
// //           countrySelect.appendChild(option);
// //         });
        
// //         // Load states when country changes
// //         countrySelect.addEventListener('change', function() {
// //           const stateSelect = document.getElementById('state');
// //           stateSelect.innerHTML = '<option value="">Select State</option>';
          
// //           // In a real app, you'd fetch states for the selected country
// //           // For demo, we'll just add some generic states
// //           if (this.value) {
// //             for (let i = 1; i <= 5; i++) {
// //               const option = document.createElement('option');
// //               option.value = `State ${i}`;
// //               option.textContent = `State ${i}`;
// //               stateSelect.appendChild(option);
// //             }
// //           }
// //         });
// //       });
// //   }
// // }

// // function initFormValidation() {
// //   // Username validation
// //   const usernameInput = document.getElementById('username');
// //   if (usernameInput) {
// //     usernameInput.addEventListener('blur', function() {
// //       const username = this.value.trim();
// //       const validationMsg = document.getElementById('username-validation');
      
// //       if (username.length < 3) {
// //         validationMsg.textContent = 'Username must be at least 3 characters';
// //         return;
// //       }
      
// //       // Check if username is available
// //       fetch(`/api/auth/check-username?username=${username}`)
// //         .then(response => response.json())
// //         .then(data => {
// //           if (data.available) {
// //             validationMsg.textContent = '';
// //           } else {
// //             validationMsg.textContent = 'Username is already taken';
// //           }
// //         });
// //     });
// //   }
  
// //   // Email validation
// //   const emailInput = document.getElementById('email');
// //   if (emailInput) {
// //     emailInput.addEventListener('blur', function() {
// //       const email = this.value.trim();
// //       const validationMsg = document.getElementById('email-validation');
      
// //       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
// //         validationMsg.textContent = 'Please enter a valid email';
// //         return;
// //       }
      
// //       // Check if email is available
// //       fetch(`/api/auth/check-email?email=${email}`)
// //         .then(response => response.json())
// //         .then(data => {
// //           if (data.available) {
// //             validationMsg.textContent = '';
// //           } else {
// //             validationMsg.textContent = 'Email is already registered';
// //           }
// //         });
// //     });
// //   }
  
// //   // Password confirmation
// //   const passwordInput = document.getElementById('password');
// //   const confirmPasswordInput = document.getElementById('confirmPassword');
// //   if (passwordInput && confirmPasswordInput) {
// //     confirmPasswordInput.addEventListener('input', function() {
// //       const validationMsg = document.getElementById('password-validation');
      
// //       if (this.value !== passwordInput.value) {
// //         validationMsg.textContent = 'Passwords do not match';
// //       } else {
// //         validationMsg.textContent = '';
// //       }
// //     });
// //   }
// // }

// // function handleLogin(e) {
// //   e.preventDefault();
  
// //   const form = e.target;
// //   const formData = new FormData(form);
// //   const data = {
// //     emailOrUsername: formData.get('emailOrUsername'),
// //     password: formData.get('password')
// //   };
  
// //   fetch('/api/auth/login', {
// //     method: 'POST',
// //     headers: {
// //       'Content-Type': 'application/json'
// //     },
// //     body: JSON.stringify(data)
// //   })
// //   .then(response => {
// //     if (!response.ok) {
// //       return response.json().then(err => { throw err; });
// //     }
// //     return response.json();
// //   })
// //   .then(data => {
// //     // Save token and redirect
// //     localStorage.setItem('token', data.token);
// //     window.location.href = '../dashboard/home.html';
// //   })
// //   .catch(error => {
// //     showToast(error.message || 'Login failed', 'error');
// //   });
// // }

// // function handleRegister(e) {
// //   e.preventDefault();
  
// //   const form = e.target;
// //   const formData = new FormData(form);
  
// //   // Validate password match
// //   const password = formData.get('password');
// //   const confirmPassword = formData.get('confirmPassword');
  
// //   if (password !== confirmPassword) {
// //     showToast('Passwords do not match', 'error');
// //     return;
// //   }
  
// //   // Submit form
// //   fetch('/api/auth/register', {
// //     method: 'POST',
// //     body: formData
// //   })
// //   .then(response => {
// //     if (!response.ok) {
// //       return response.json().then(err => { throw err; });
// //     }
// //     return response.json();
// //   })
// //   .then(data => {
// //     showToast('Registration successful! Please login', 'success');
// //     setTimeout(() => {
// //       window.location.href = 'login.html';
// //     }, 1500);
// //   })
// //   .catch(error => {
// //     showToast(error.message || 'Registration failed', 'error');
// //   });
// // }

// // function handleForgotPassword(e) {
// //   e.preventDefault();
  
// //   const form = e.target;
// //   const formData = new FormData(form);
// //   const data = {
// //     email: formData.get('email'),
// //     phone: formData.get('phone')
// //   };
  
// //   fetch('/api/auth/forgot-password', {
// //     method: 'POST',
// //     headers: {
// //       'Content-Type': 'application/json'
// //     },
// //     body: JSON.stringify(data)
// //   })
// //   .then(response => {
// //     if (!response.ok) {
// //       return response.json().then(err => { throw err; });
// //     }
// //     return response.json();
// //   })
// //   .then(data => {
// //     showToast('If your email and phone match our records, you will receive a reset link', 'success');
// //   })
// //   .catch(error => {
// //     showToast(error.message || 'Password reset failed', 'error');
// //   });
// // }

// // function showToast(message, type = 'info') {
// //   // Create toast element
// //   const toast = document.createElement('div');
// //   toast.className = `toast toast-${type}`;
// //   toast.textContent = message;
  
// //   // Add to body
// //   document.body.appendChild(toast);
  
// //   // Remove after delay
// //   setTimeout(() => {
// //     toast.classList.add('fade-out');
// //     setTimeout(() => toast.remove(), 300);
// //   }, 3000);
// // }