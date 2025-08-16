document.addEventListener('DOMContentLoaded', function() {
  // Initialize communities page
  if (document.getElementById('communities-container')) {
    loadCommunities();
    setupCommunityListeners();
  }
  
  // Initialize create community page
  if (document.getElementById('create-community-form')) {
    initCreateCommunityForm();
  }
});

function loadCommunities() {
  const token = localStorage.getItem('token');
  const communitiesContainer = document.getElementById('communities-container');
  
  // Show loading state
  communitiesContainer.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Loading communities...</span>
    </div>
  `;
  
  fetch('/api/communities', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load communities');
    }
    return response.json();
  })
  .then(communities => {
    if (communities.length === 0) {
      communitiesContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users-slash"></i>
          <p>No communities found</p>
          <a href="create-community.html" class="btn btn-primary">Create Community</a>
        </div>
      `;
      return;
    }
    
    communitiesContainer.innerHTML = communities.map(community => createCommunityCard(community)).join('');
    
    // Add event listeners to join buttons
    document.querySelectorAll('.join-community-btn').forEach(button => {
      button.addEventListener('click', handleJoinCommunity);
    });
  })
  .catch(error => {
    console.error('Error loading communities:', error);
    communitiesContainer.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load communities</p>
        <button class="btn btn-primary" onclick="loadCommunities()">Try Again</button>
      </div>
    `;
  });
}

function createCommunityCard(community) {
  return `
    <div class="community-card" data-community-id="${community.id}">
      <img src="${community.image_url || '../assets/images/community-default.jpg'}" alt="${community.name}" class="community-image">
      <div class="community-details">
        <h3 class="community-name">${community.name}</h3>
        <p class="community-description">${community.description || 'No description provided'}</p>
      </div>
      <div class="community-footer">
        <div class="community-members">
          <i class="fas fa-users"></i>
          <span>${community.members_count || 0} members</span>
        </div>
        <button class="btn ${community.isMember ? 'btn-outline' : 'btn-primary'} join-community-btn" data-community-id="${community.id}">
          ${community.isMember ? 'Joined' : 'Join'}
        </button>
      </div>
    </div>
  `;
}

function handleJoinCommunity(e) {
  const button = e.target;
  const communityId = button.getAttribute('data-community-id');
  const token = localStorage.getItem('token');
  const isMember = button.classList.contains('btn-outline');
  
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  const endpoint = isMember ? 'leave' : 'join';
  
  fetch(`/api/communities/${communityId}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to ${endpoint} community`);
    }
    return response.json();
  })
  .then(data => {
    showToast(`Successfully ${isMember ? 'left' : 'joined'} the community`, 'success');
    
    if (isMember) {
      button.classList.remove('btn-outline');
      button.classList.add('btn-primary');
      button.textContent = 'Join';
    } else {
      button.classList.remove('btn-primary');
      button.classList.add('btn-outline');
      button.textContent = 'Joined';
    }
  })
  .catch(error => {
    console.error(`Error ${endpoint}ing community:`, error);
    showToast(error.message || `Failed to ${endpoint} community`, 'error');
  })
  .finally(() => {
    button.disabled = false;
  });
}

function initCreateCommunityForm() {
  const form = document.getElementById('create-community-form');
  const imageInput = document.getElementById('community-image');
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
    
    // Submit form
    fetch('/api/communities', {
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
      showToast('Community created successfully!', 'success');
      setTimeout(() => {
        window.location.href = `community-details.html?id=${data.communityId}`;
      }, 1500);
    })
    .catch(error => {
      console.error('Error creating community:', error);
      showToast(error.message || 'Failed to create community', 'error');
    });
  });
}

function setupCommunityListeners() {
  // Search functionality
  const searchInput = document.querySelector('.search-box input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const communityCards = document.querySelectorAll('.community-card');
      
      communityCards.forEach(card => {
        const name = card.querySelector('.community-name').textContent.toLowerCase();
        const description = card.querySelector('.community-description').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || description.includes(searchTerm)) {
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
      // In a real app, you would fetch filtered communities from the server
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