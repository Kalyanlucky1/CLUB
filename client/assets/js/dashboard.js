document.addEventListener('DOMContentLoaded', function() {
  // Initialize the dashboard
  initDashboard();
  
  // Event listeners
  setupEventListeners();
  
  // Connect to Socket.io
  connectSocket();
});

function initDashboard() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '../auth/login.html';
    return;
  }
  
  // Load user data
  loadUserData();
  
  // Load events data
  loadEventsData();
  
  // Load communities data
  loadCommunitiesData();
  
  // Setup tab switching
  setupTabs();
}

function setupEventListeners() {
  // Menu toggle for mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      document.querySelector('.sidebar').classList.toggle('active');
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

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active class from all buttons and panes
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Show corresponding pane
      const tabId = this.getAttribute('data-tab');
      document.getElementById(`${tabId}-events`).classList.add('active');
    });
  });
}

function loadUserData() {
  const token = localStorage.getItem('token');
  
  fetch('/api/users/profile', {
    method: 'GET',
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
    // Update profile information
    document.getElementById('user-avatar').src = data.profile_pic || '../assets/images/default-avatar.jpg';
    document.getElementById('profile-pic').src = data.profile_pic || '../assets/images/default-avatar.jpg';
    document.getElementById('username').textContent = data.username;
    document.getElementById('full-name').textContent = data.name;
    document.getElementById('user-bio').textContent = data.bio || 'No bio yet';
    document.getElementById('user-location').textContent = `${data.city || 'Unknown'}, ${data.state || 'Unknown'}`;
    
    // Update stats
    document.getElementById('tribe-points').textContent = data.points;
    document.getElementById('events-attended').textContent = data.eventsAttended;
    document.getElementById('communities-joined').textContent = data.communities.length;
    
    // Update level
    document.getElementById('level-icon').textContent = data.levelIcon;
    document.getElementById('level-text').textContent = getLevelText(data.points);
    
    // Update created events
    if (data.createdEvents.length > 0) {
      const createdEventsContainer = document.getElementById('created-events');
      createdEventsContainer.innerHTML = `
        <div class="events-list">
          ${data.createdEvents.map(event => createEventCard(event, true)).join('')}
        </div>
      `;
    }
    
    // Update joined events
    if (data.joinedEvents.length > 0) {
      const joinedEventsContainer = document.getElementById('joined-events');
      joinedEventsContainer.innerHTML = `
        <div class="events-list">
          ${data.joinedEvents.map(event => createEventCard(event, false)).join('')}
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Error loading user data:', error);
    showToast('Failed to load user data', 'error');
  });
}

function loadEventsData() {
  const token = localStorage.getItem('token');
  
  fetch('/api/events', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    return response.json();
  })
  .then(events => {
    // You can use this data to show upcoming events or other event-related content
    console.log('Loaded events:', events);
  })
  .catch(error => {
    console.error('Error loading events:', error);
  });
}

function loadCommunitiesData() {
  const token = localStorage.getItem('token');
  
  fetch('/api/communities', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch communities');
    }
    return response.json();
  })
  .then(communities => {
    // You can use this data to show community suggestions or other community-related content
    console.log('Loaded communities:', communities);
  })
  .catch(error => {
    console.error('Error loading communities:', error);
  });
}

function createEventCard(event, isCreator) {
  const eventDate = new Date(`${event.date}T${event.time}`);
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `
    <div class="event-card">
      <div class="event-date">
        <div class="event-day">${formattedDate.split(' ')[0]}</div>
        <div class="event-month-day">${formattedDate.split(' ').slice(1).join(' ')}</div>
      </div>
      <div class="event-details">
        <h4>${event.title}</h4>
        <p class="event-time">${formattedTime} • ${event.location}</p>
        ${isCreator ? '<span class="badge creator-badge">Creator</span>' : ''}
      </div>
      <div class="event-actions">
        <button class="btn btn-outline">Details</button>
      </div>
    </div>
  `;
}

function getLevelText(points) {
  if (points > 180) return 'Smile Level';
  if (points > 60) return 'Heart Level';
  return 'Peace Level';
}

function connectSocket() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  // Connect to Socket.io server
  const socket = io(process.env.SOCKET_URL || 'http://localhost:5000', {
    auth: {
      token: token
    }
  });
  
  // Join user's personal room
  socket.on('connect', () => {
    const userId = getUserIdFromToken(token); // You'd need to implement this
    if (userId) {
      socket.emit('joinUserRoom', userId);
    }
  });
  
  // Handle new message notification
  socket.on('newMessage', (data) => {
    showToast(`New message from ${data.senderName}`, 'info');
    // You might want to update the chat UI or notification count
  });
  
  // Handle event updates
  socket.on('eventUpdated', (eventId) => {
    // Refresh events data if needed
    loadEventsData();
  });
}

function showToast(message, type = 'info') {
  // Implement a toast notification system
  console.log(`[${type}] ${message}`);
}