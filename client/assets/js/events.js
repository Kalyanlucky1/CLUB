document.addEventListener('DOMContentLoaded', function() {
  // Initialize events page
  if (document.getElementById('events-container')) {
    loadEvents();
    setupEventListeners();
  }
  
  // Initialize create event page
  if (document.getElementById('create-event-form')) {
    initCreateEventForm();
  }
});

function loadEvents() {
  const token = localStorage.getItem('token');
  const eventsContainer = document.getElementById('events-container');
  
  // Show loading state
  eventsContainer.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Loading events...</span>
    </div>
  `;
  
  fetch('/api/events', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load events');
    }
    return response.json();
  })
  .then(events => {
    if (events.length === 0) {
      eventsContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-calendar-times"></i>
          <p>No events found</p>
          <a href="create-event.html" class="btn btn-primary">Create Event</a>
        </div>
      `;
      return;
    }
    
    eventsContainer.innerHTML = events.map(event => createEventCard(event)).join('');
    
    // Add event listeners to join buttons
    document.querySelectorAll('.join-event-btn').forEach(button => {
      button.addEventListener('click', handleJoinEvent);
    });
  })
  .catch(error => {
    console.error('Error loading events:', error);
    eventsContainer.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load events</p>
        <button class="btn btn-primary" onclick="loadEvents()">Try Again</button>
      </div>
    `;
  });
}

function createEventCard(event) {
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
    <div class="event-card" data-event-id="${event.id}">
      <img src="${event.image_url || '../assets/images/event-default.jpg'}" alt="${event.title}" class="event-image">
      <div class="event-details">
        <h3 class="event-title">${event.title}</h3>
        <div class="event-date">
          <i class="fas fa-calendar-alt"></i>
          ${formattedDate} at ${formattedTime}
        </div>
        <p class="event-description">${event.description || 'No description provided'}</p>
      </div>
      <div class="event-footer">
        <div class="event-creator">
          <img src="${event.creator_avatar || '../assets/images/default-avatar.jpg'}" alt="${event.creator_name}">
          <span>Created by ${event.creator_name}</span>
        </div>
        <button class="btn btn-primary join-event-btn" data-event-id="${event.id}">
          ${event.isAttending ? 'Joined' : 'Join'}
        </button>
      </div>
    </div>
  `;
}

function handleJoinEvent(e) {
  const button = e.target;
  const eventId = button.getAttribute('data-event-id');
  const token = localStorage.getItem('token');
  
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  fetch(`/api/events/${eventId}/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to join event');
    }
    return response.json();
  })
  .then(data => {
    showToast('Successfully joined the event', 'success');
    button.textContent = 'Joined';
    button.classList.add('joined');
  })
  .catch(error => {
    console.error('Error joining event:', error);
    showToast(error.message || 'Failed to join event', 'error');
    button.disabled = false;
    button.textContent = 'Join';
  });
}

function initCreateEventForm() {
  const form = document.getElementById('create-event-form');
  const imageInput = document.getElementById('event-image');
  const imagePreview = document.getElementById('preview-image');
  
  // Handle image preview
  imageInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
      }
      
      reader.readAsDataURL(this.files[0]);
    }
  });
  
  // Handle form submission
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    const token = localStorage.getItem('token');
    
    // Validate date is in the future
    const eventDate = new Date(formData.get('date'));
    if (eventDate < new Date()) {
      showToast('Event date must be in the future', 'error');
      return;
    }
    
    // Submit form
    fetch('/api/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => { throw err; });
      }
      return response.json();
    })
    .then(data => {
      showToast('Event created successfully!', 'success');
      setTimeout(() => {
        window.location.href = `event-details.html?id=${data.eventId}`;
      }, 1500);
    })
    .catch(error => {
      console.error('Error creating event:', error);
      showToast(error.message || 'Failed to create event', 'error');
    });
  });
}

function setupEventListeners() {
  // Search functionality
  const searchInput = document.querySelector('.search-box input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const eventCards = document.querySelectorAll('.event-card');
      
      eventCards.forEach(card => {
        const title = card.querySelector('.event-title').textContent.toLowerCase();
        const description = card.querySelector('.event-description').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
  
  // Filter functionality
  const filterSelect = document.querySelector('.filter-select');
  if (filterSelect) {
    filterSelect.addEventListener('change', function() {
      // In a real app, you would fetch filtered events from the server
      console.log('Filter changed to:', this.value);
    });
  }
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