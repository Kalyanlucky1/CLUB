document.addEventListener('DOMContentLoaded', function() {
  // Initialize profile page
  initProfilePage();
  
  // Load user data
  loadUserData();
  
  // Setup event listeners
  setupProfileListeners();
});

function initProfilePage() {
  // Check authentication
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '../auth/login.html';
    return;
  }
  
  // Initialize tab switching
  const tabBtns = document.querySelectorAll('.profile-tabs .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active class from all buttons and tabs
      document.querySelectorAll('.profile-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Show corresponding tab
      const tabId = this.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

function loadUserData() {
  const token = localStorage.getItem('token');
  
  fetch('/api/users/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    return response.json();
  })
  .then(data => {
    // Update profile header
    document.getElementById('profile-avatar').src = data.profile_pic || '../assets/images/default-avatar.jpg';
    document.getElementById('user-avatar').src = data.profile_pic || '../assets/images/default-avatar.jpg';
    document.getElementById('profile-name').textContent = data.name;
    document.getElementById('profile-username').textContent = `@${data.username}`;
    document.getElementById('username').textContent = data.username;
    
    // Update stats
    document.getElementById('profile-points').textContent = data.points;
    document.getElementById('profile-events').textContent = data.eventsAttended;
    document.getElementById('profile-communities').textContent = data.communities.length;
    
    // Update form fields
    document.getElementById('full-name').value = data.name;
    document.getElementById('username-input').value = data.username;
    document.getElementById('email').value = data.email;
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('bio').value = data.bio || '';
    document.getElementById('interests').value = data.interests || '';
    document.getElementById('city').value = data.city || '';
    
    // Load countries and states
    loadCountries(data.country, data.state);
  })
  .catch(error => {
    console.error('Error loading user data:', error);
    showToast('Failed to load profile data', 'error');
  });
}

function loadCountries(selectedCountry, selectedState) {
  const countrySelect = document.getElementById('country');
  const stateSelect = document.getElementById('state');
  
  // Load countries
  fetch('https://restcountries.com/v3.1/all')
    .then(response => response.json())
    .then(countries => {
      countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
      
      countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.name.common;
        option.textContent = country.name.common;
        if (selectedCountry === country.name.common) {
          option.selected = true;
        }
        countrySelect.appendChild(option);
      });
      
      // Load states when country is selected or if we have a selected country
      if (selectedCountry) {
        loadStatesForCountry(selectedCountry, selectedState);
      }
      
      countrySelect.addEventListener('change', function() {
        loadStatesForCountry(this.value);
      });
    });
}

function loadStatesForCountry(country, selectedState = '') {
  const stateSelect = document.getElementById('state');
  stateSelect.innerHTML = '<option value="">Select State</option>';
  
  // In a real app, you would fetch states for the selected country
  // For demo purposes, we'll just add some generic states
  if (country) {
    const states = ['State 1', 'State 2', 'State 3', 'State 4', 'State 5'];
    
    states.forEach(state => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state;
      if (selectedState === state) {
        option.selected = true;
      }
      stateSelect.appendChild(option);
    });
  }
}

function setupProfileListeners() {
  // Avatar upload
  const avatarUpload = document.getElementById('avatar-upload');
  if (avatarUpload) {
    avatarUpload.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('profilePic', this.files[0]);
        
        // Show loading state
        const avatarImg = document.getElementById('profile-avatar');
        const originalSrc = avatarImg.src;
        const reader = new FileReader();
        
        reader.onload = function(e) {
          avatarImg.src = e.target.result;
        }
        reader.readAsDataURL(this.files[0]);
        
        // Upload to server
        fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to update profile picture');
          }
          return response.json();
        })
        .then(data => {
          showToast('Profile picture updated successfully', 'success');
          // Update avatar in header
          document.getElementById('user-avatar').src = avatarImg.src;
        })
        .catch(error => {
          console.error('Error updating profile picture:', error);
          avatarImg.src = originalSrc;
          showToast(error.message || 'Failed to update profile picture', 'error');
        });
      }
    });
  }
  
  // Profile form submission
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const token = localStorage.getItem('token');
      const formData = new FormData(this);
      const data = {};
      
      formData.forEach((value, key) => {
        data[key] = value;
      });
      
      fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update profile');
        }
        return response.json();
      })
      .then(data => {
        showToast('Profile updated successfully', 'success');
        // Update displayed name
        document.getElementById('profile-name').textContent = data.name;
        document.getElementById('username').textContent = data.username;
      })
      .catch(error => {
        console.error('Error updating profile:', error);
        showToast(error.message || 'Failed to update profile', 'error');
      });
    });
  }
  
  // Change password modal
  const changePasswordBtn = document.getElementById('change-password-btn');
  const changePasswordModal = document.getElementById('change-password-modal');
  const changePasswordForm = document.getElementById('change-password-form');
  
  if (changePasswordBtn && changePasswordModal) {
    changePasswordBtn.addEventListener('click', function() {
      changePasswordModal.classList.add('active');
    });
    
    // Close modal handlers
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', function() {
        changePasswordModal.classList.remove('active');
      });
    });
    
    // Change password form submission
    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const formData = new FormData(this);
        const data = {
          currentPassword: formData.get('currentPassword'),
          newPassword: formData.get('newPassword')
        };
        
        if (data.newPassword !== formData.get('confirmPassword')) {
          showToast('New passwords do not match', 'error');
          return;
        }
        
        fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
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
          showToast('Password changed successfully', 'success');
          changePasswordModal.classList.remove('active');
          changePasswordForm.reset();
        })
        .catch(error => {
          console.error('Error changing password:', error);
          showToast(error.message || 'Failed to change password', 'error');
        });
      });
    }
  }
  
  // Danger zone actions
  const deactivateBtn = document.getElementById('deactivate-account-btn');
  const deleteBtn = document.getElementById('delete-account-btn');
  
  if (deactivateBtn) {
    deactivateBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to deactivate your account? You can reactivate it by logging in again.')) {
        deactivateAccount();
      }
    });
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
        deleteAccount();
      }
    });
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('token');
      window.location.href = '../auth/login.html';
    });
  }
}

function deactivateAccount() {
  const token = localStorage.getItem('token');
  
  fetch('/api/users/deactivate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to deactivate account');
    }
    return response.json();
  })
  .then(data => {
    showToast('Account deactivated successfully', 'success');
    setTimeout(() => {
      localStorage.removeItem('token');
      window.location.href = '../auth/login.html';
    }, 1500);
  })
  .catch(error => {
    console.error('Error deactivating account:', error);
    showToast(error.message || 'Failed to deactivate account', 'error');
  });
}

function deleteAccount() {
  const token = localStorage.getItem('token');
  
  fetch('/api/users/delete', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to delete account');
    }
    return response.json();
  })
  .then(data => {
    showToast('Account deleted successfully', 'success');
    setTimeout(() => {
      localStorage.removeItem('token');
      window.location.href = '../auth/login.html';
    }, 1500);
  })
  .catch(error => {
    console.error('Error deleting account:', error);
    showToast(error.message || 'Failed to delete account', 'error');
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