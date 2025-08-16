document.addEventListener('DOMContentLoaded', function() {
  // Check admin authentication
  checkAdminAuth();
  
  // Initialize the current page
  if (document.getElementById('signups-chart')) {
    initDashboard();
  } else if (document.getElementById('users-table-body')) {
    initUsersPage();
  }
});

function checkAdminAuth() {
  const token = localStorage.getItem('adminToken');
  if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }
  
  // Verify token is valid
  if (token) {
    fetch('/api/admin/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
      }
    })
    .catch(() => {
      localStorage.removeItem('adminToken');
      window.location.href = 'login.html';
    });
  }
}

function initDashboard() {
  // Load dashboard stats
  loadDashboardStats();
  
  // Load recent activities
  loadRecentActivities();
  
  // Setup event listeners
  setupDashboardListeners();
}

function loadDashboardStats() {
  const token = localStorage.getItem('adminToken');
  
  fetch('/api/admin/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load dashboard data');
    }
    return response.json();
  })
  .then(data => {
    // Update stats cards
    document.getElementById('total-users').textContent = data.totalUsers;
    document.getElementById('active-users').textContent = data.activeUsers;
    document.getElementById('total-events').textContent = data.totalEvents;
    document.getElementById('total-communities').textContent = data.totalCommunities;
    
    // Create charts
    createSignupsChart(data.signupsData);
    createActivityChart(data.activityData);
    
    // Render recent activities
    renderActivities(data.recentActivities);
  })
  .catch(error => {
    console.error('Error loading dashboard data:', error);
    showToast('Failed to load dashboard data', 'error');
  });
}

function createSignupsChart(data) {
  const ctx = document.getElementById('signups-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'User Signups',
        data: data.values,
        backgroundColor: 'rgba(78, 115, 223, 0.05)',
        borderColor: 'rgba(78, 115, 223, 1)',
        pointBackgroundColor: 'rgba(78, 115, 223, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
        borderWidth: 2,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

function createActivityChart(data) {
  const ctx = document.getElementById('activity-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: [
          'rgba(78, 115, 223, 0.8)',
          'rgba(28, 200, 138, 0.8)',
          'rgba(54, 185, 204, 0.8)',
          'rgba(246, 194, 62, 0.8)',
          'rgba(231, 74, 59, 0.8)'
        ],
        hoverBackgroundColor: [
          'rgba(78, 115, 223, 1)',
          'rgba(28, 200, 138, 1)',
          'rgba(54, 185, 204, 1)',
          'rgba(246, 194, 62, 1)',
          'rgba(231, 74, 59, 1)'
        ],
        hoverBorderColor: "rgba(234, 236, 244, 1)",
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        }
      },
      cutout: '70%'
    }
  });
}

function loadRecentActivities() {
  const token = localStorage.getItem('adminToken');
  
  fetch('/api/admin/activities', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load recent activities');
    }
    return response.json();
  })
  .then(data => {
    renderActivities(data.logs);
  })
  .catch(error => {
    console.error('Error loading recent activities:', error);
    document.getElementById('activities-list').innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load activities</p>
        <button class="btn btn-primary" onclick="loadRecentActivities()">Try Again</button>
      </div>
    `;
  });
}

function renderActivities(activities) {
  const container = document.getElementById('activities-list');
  
  if (activities.length === 0) {
    container.innerHTML = '<p>No activities found</p>';
    return;
  }
  
  container.innerHTML = activities.map(activity => `
    <div class="activity-item">
      <div class="activity-icon">
        <i class="fas ${getActivityIcon(activity.type)}"></i>
      </div>
      <div class="activity-details">
        <div class="activity-user">${activity.user_name || 'System'}</div>
        <div class="activity-description">${getActivityDescription(activity)}</div>
        <div class="activity-time">${formatTime(activity.created_at)}</div>
      </div>
    </div>
  `).join('');
}

function getActivityIcon(type) {
  switch(type) {
    case 'signup': return 'fa-user-plus';
    case 'login': return 'fa-sign-in-alt';
    case 'event_created': return 'fa-calendar-plus';
    case 'event_joined': return 'fa-user-check';
    case 'community_created': return 'fa-users';
    case 'community_joined': return 'fa-user-plus';
    case 'message_sent': return 'fa-comment';
    case 'points_updated': return 'fa-star';
    case 'admin_action': return 'fa-shield-alt';
    default: return 'fa-info-circle';
  }
}

function getActivityDescription(activity) {
  switch(activity.type) {
    case 'signup': return 'New user registration';
    case 'login': return 'User logged in';
    case 'event_created': return `Created event: ${activity.details}`;
    case 'event_joined': return `Joined event`;
    case 'community_created': return `Created community: ${activity.details}`;
    case 'community_joined': return `Joined community`;
    case 'message_sent': return `Sent a message`;
    case 'points_updated': return `Points updated to ${activity.details}`;
    case 'admin_action': return activity.details;
    default: return activity.details || 'Activity performed';
  }
}

function setupDashboardListeners() {
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('adminToken');
      window.location.href = 'login.html';
    });
  }
}

function initUsersPage() {
  // Load users
  loadUsers();
  
  // Setup event listeners
  setupUsersListeners();
}

let currentPage = 1;
let totalPages = 1;

function loadUsers(page = 1, search = '', status = 'all', sort = 'newest') {
  const token = localStorage.getItem('adminToken');
  const tableBody = document.getElementById('users-table-body');
  
  // Show loading state
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="loading-row">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading users...</span>
      </td>
    </tr>
  `;
  
  // Build query string
  const query = new URLSearchParams({
    page,
    search,
    status,
    sort
  }).toString();
  
  fetch(`/api/admin/users?${query}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load users');
    }
    return response.json();
  })
  .then(data => {
    currentPage = data.page;
    totalPages = data.totalPages;
    
    // Update pagination
    updatePagination();
    
    // Render users
    if (data.users.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7">No users found</td>
        </tr>
      `;
      return;
    }
    
    tableBody.innerHTML = data.users.map(user => `
      <tr>
        <td class="user-cell">
          <img src="${user.profile_pic || '../client/assets/images/default-avatar.jpg'}" 
               alt="${user.name}" class="user-avatar">
          <div>
            <div>${user.name}</div>
            <div class="text-muted">${user.email}</div>
          </div>
        </td>
        <td>
          <span class="status-badge status-${user.status}">${user.status}</span>
        </td>
        <td>${user.points}</td>
        <td>${user.events_count}</td>
        <td>${user.communities_count}</td>
        <td>${formatDate(user.created_at)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-primary view-user" data-user-id="${user.id}">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline edit-user" data-user-id="${user.id}">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    
    // Add event listeners to action buttons
    document.querySelectorAll('.view-user').forEach(btn => {
      btn.addEventListener('click', function() {
        const userId = this.getAttribute('data-user-id');
        viewUserDetails(userId);
      });
    });
    
    document.querySelectorAll('.edit-user').forEach(btn => {
      btn.addEventListener('click', function() {
        const userId = this.getAttribute('data-user-id');
        editUser(userId);
      });
    });
  })
  .catch(error => {
    console.error('Error loading users:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load users</p>
          <button class="btn btn-primary" onclick="loadUsers()">Try Again</button>
        </td>
      </tr>
    `;
  });
}

function updatePagination() {
  document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prev-page').disabled = currentPage === 1;
  document.getElementById('next-page').disabled = currentPage === totalPages;
}

function viewUserDetails(userId) {
  const token = localStorage.getItem('adminToken');
  const modal = document.getElementById('user-detail-modal');
  const modalContent = document.getElementById('user-detail-content');
  
  // Show loading state
  modalContent.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Loading user details...</span>
    </div>
  `;
  
  // Show modal
  modal.classList.add('active');
  
  // Load user details
  fetch(`/api/admin/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load user details');
    }
    return response.json();
  })
  .then(user => {
    // Render user details
    modalContent.innerHTML = `
      <div class="user-detail-header">
        <img src="${user.profile_pic || '../client/assets/images/default-avatar.jpg'}" 
             alt="${user.name}" class="user-detail-avatar">
        <div class="user-detail-info">
          <h3>${user.name}</h3>
          <div class="user-detail-meta">
            <div>${user.email}</div>
            <div>${user.phone || 'No phone number'}</div>
            <div>Joined ${formatDate(user.created_at)}</div>
          </div>
          <span class="status-badge status-${user.status}">${user.status}</span>
        </div>
      </div>
      
      <div class="user-detail-stats">
        <div class="user-detail-stat">
          <h4>${user.points}</h4>
          <p>Tribe Points</p>
        </div>
        <div class="user-detail-stat">
          <h4>${user.events_count}</h4>
          <p>Events Attended</p>
        </div>
        <div class="user-detail-stat">
          <h4>${user.communities_count}</h4>
          <p>Communities</p>
        </div>
        <div class="user-detail-stat">
          <h4>${user.last_login ? formatTime(user.last_login) : 'Never'}</h4>
          <p>Last Login</p>
        </div>
      </div>
      
      <div class="user-detail-section">
        <h4>About</h4>
        <p>${user.bio || 'No bio provided'}</p>
      </div>
      
      <div class="user-detail-section">
        <h4>Location</h4>
        <p>${[user.city, user.state, user.country].filter(Boolean).join(', ') || 'No location provided'}</p>
      </div>
      
      <div class="user-detail-section">
        <h4>Interests</h4>
        <p>${user.interests || 'No interests specified'}</p>
      </div>
      
      ${user.events.length > 0 ? `
      <div class="user-detail-section">
        <h4>Recent Events</h4>
        <div class="user-events-list">
          ${user.events.slice(0, 4).map(event => `
            <div class="user-event-card">
              <h5>${event.title}</h5>
              <p>${formatDate(event.date)}</p>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      ${user.communities.length > 0 ? `
      <div class="user-detail-section">
        <h4>Communities</h4>
        <div class="user-communities-list">
          ${user.communities.slice(0, 4).map(community => `
            <div class="user-community-card">
              <h5>${community.name}</h5>
              <p>Member since ${formatDate(community.joined_at)}</p>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <div class="user-actions">
        <button class="btn btn-outline close-modal">Close</button>
        <button class="btn btn-primary edit-user" data-user-id="${user.id}">
          <i class="fas fa-edit"></i> Edit User
        </button>
      </div>
    `;
    
    // Add event listener to edit button
    modalContent.querySelector('.edit-user').addEventListener('click', function() {
      modal.classList.remove('active');
      editUser(userId);
    });
  })
  .catch(error => {
    console.error('Error loading user details:', error);
    modalContent.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load user details</p>
        <button class="btn btn-primary" onclick="viewUserDetails('${userId}')">Try Again</button>
      </div>
    `;
  });
  
  // Close modal handlers
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', function() {
      modal.classList.remove('active');
    });
  });
}

function editUser(userId) {
  // In a real app, you would show an edit form
  alert(`Edit user ${userId} functionality would be implemented here`);
}

function setupUsersListeners() {
  // Search input
  const searchInput = document.getElementById('user-search');
  searchInput.addEventListener('input', debounce(function() {
    loadUsers(1, this.value, 
              document.getElementById('status-filter').value,
              document.getElementById('sort-by').value);
  }, 300));
  
  // Filter dropdowns
  document.getElementById('status-filter').addEventListener('change', function() {
    loadUsers(1, searchInput.value, this.value,
              document.getElementById('sort-by').value);
  });
  
  document.getElementById('sort-by').addEventListener('change', function() {
    loadUsers(1, searchInput.value, 
              document.getElementById('status-filter').value,
              this.value);
  });
  
  // Pagination buttons
  document.getElementById('prev-page').addEventListener('click', function() {
    if (currentPage > 1) {
      loadUsers(currentPage - 1, searchInput.value, 
                document.getElementById('status-filter').value,
                document.getElementById('sort-by').value);
    }
  });
  
  document.getElementById('next-page').addEventListener('click', function() {
    if (currentPage < totalPages) {
      loadUsers(currentPage + 1, searchInput.value, 
                document.getElementById('status-filter').value,
                document.getElementById('sort-by').value);
    }
  });
  
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('adminToken');
      window.location.href = 'login.html';
    });
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
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