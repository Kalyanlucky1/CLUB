document.addEventListener('DOMContentLoaded', function() {
  // Initialize chat page
  initChat();
  
  // Connect to Socket.io
  connectSocket();
});

let socket = null;
let currentConversation = null;

function initChat() {
  // Load conversations
  loadConversations();
  
  // Setup event listeners
  setupChatListeners();
  
  // Update user info in header
  updateUserInfo();
}

function connectSocket() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  // Connect to Socket.io server
  socket = io(process.env.SOCKET_URL || 'http://localhost:5000', {
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
  
  // Handle new message
  socket.on('newMessage', (message) => {
    if (currentConversation && 
        ((message.sender_id === currentConversation.id && message.receiver_id === getUserIdFromToken(token)) ||
         (message.receiver_id === currentConversation.id && message.sender_id === getUserIdFromToken(token)))) {
      // Add message to current conversation
      addMessageToChat(message, message.sender_id === getUserIdFromToken(token) ? 'outgoing' : 'incoming');
    } else {
      // Update conversation list
      updateConversationList(message);
      showNewMessageNotification(message);
    }
  });
  
  // Handle new community message
  socket.on('newCommunityMessage', (message) => {
    if (currentConversation && currentConversation.id === message.community_id) {
      // Add message to current conversation
      addMessageToChat(message, message.sender_id === getUserIdFromToken(token) ? 'outgoing' : 'incoming');
    } else {
      // Update conversation list
      updateCommunityConversationList(message);
      showNewMessageNotification(message);
    }
  });
}

function loadConversations() {
  const token = localStorage.getItem('token');
  const conversationsList = document.getElementById('conversations-list');
  
  // Show loading state
  conversationsList.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Loading conversations...</span>
    </div>
  `;
  
  fetch('/api/chat/conversations', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load conversations');
    }
    return response.json();
  })
  .then(data => {
    if (data.directMessages.length === 0 && data.communityMessages.length === 0) {
      conversationsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comment-slash"></i>
          <p>No conversations yet</p>
        </div>
      `;
      return;
    }
    
    // Render direct messages
    let html = '<div class="conversation-group"><h4>Direct Messages</h4>';
    
    if (data.directMessages.length === 0) {
      html += '<p class="no-conversations">No direct messages</p>';
    } else {
      html += data.directMessages.map(conv => createConversationItem(conv, 'user')).join('');
    }
    
    html += '</div><div class="conversation-group"><h4>Communities</h4>';
    
    if (data.communityMessages.length === 0) {
      html += '<p class="no-conversations">No community chats</p>';
    } else {
      html += data.communityMessages.map(conv => createConversationItem(conv, 'community')).join('');
    }
    
    html += '</div>';
    conversationsList.innerHTML = html;
    
    // Add click handlers to conversation items
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', function() {
        const type = this.getAttribute('data-type');
        const id = this.getAttribute('data-id');
        loadConversation(type, id);
        
        // Mark as active
        document.querySelectorAll('.conversation-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
      });
    });
  })
  .catch(error => {
    console.error('Error loading conversations:', error);
    conversationsList.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load conversations</p>
        <button class="btn btn-primary" onclick="loadConversations()">Try Again</button>
      </div>
    `;
  });
}

function createConversationItem(conversation, type) {
  const levelIcon = getLevelIcon(conversation.points);
  
  return `
    <div class="conversation-item" data-type="${type}" data-id="${type === 'user' ? conversation.user_id : conversation.community_id}">
      <img src="${type === 'user' ? conversation.profile_pic || '../assets/images/default-avatar.jpg' : 
                   conversation.image_url || '../assets/images/community-default.jpg'}" 
           alt="${type === 'user' ? conversation.name : conversation.name}" 
           class="conversation-avatar">
      <div class="conversation-info">
        <div class="conversation-name">
          ${type === 'user' ? conversation.name : conversation.name}
          ${type === 'user' && levelIcon ? `<span class="level-icon">${levelIcon}</span>` : ''}
        </div>
        <div class="conversation-last-message">${conversation.last_message || 'No messages yet'}</div>
      </div>
      <div class="conversation-meta">
        <div class="conversation-time">${conversation.last_message_time ? formatTime(conversation.last_message_time) : ''}</div>
        ${conversation.unread_count > 0 ? `<div class="conversation-unread">${conversation.unread_count}</div>` : ''}
      </div>
    </div>
  `;
}

function loadConversation(type, id) {
  const token = localStorage.getItem('token');
  const messagesContainer = document.getElementById('messages-container');
  
  // Show loading state
  messagesContainer.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Loading messages...</span>
    </div>
  `;
  
  fetch(`/api/chat/messages/${type}/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load messages');
    }
    return response.json();
  })
  .then(messages => {
    currentConversation = { type, id };
    
    // Update chat header
    updateChatHeader(type, id);
    
    // Display messages
    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comment-alt"></i>
          <p>No messages yet</p>
        </div>
      `;
      return;
    }
    
    messagesContainer.innerHTML = '';
    messages.forEach(message => {
      const isOutgoing = message.sender_id === getUserIdFromToken(token);
      addMessageToChat(message, isOutgoing ? 'outgoing' : 'incoming');
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  })
  .catch(error => {
    console.error('Error loading messages:', error);
    messagesContainer.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load messages</p>
        <button class="btn btn-primary" onclick="loadConversation('${type}', '${id}')">Try Again</button>
      </div>
    `;
  });
}

function addMessageToChat(message, direction) {
  const messagesContainer = document.getElementById('messages-container');
  
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${direction}`;
  
  let contentHtml = '';
  if (message.image_url) {
    contentHtml += `<img src="${message.image_url}" class="message-image" alt="Sent image">`;
  }
  if (message.message) {
    contentHtml += `<div class="message-content">${message.message}</div>`;
  }
  
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageEl.innerHTML = `
    ${contentHtml}
    <div class="message-meta">
      <span class="message-time">${time}</span>
      ${direction === 'outgoing' ? '<span class="message-status"><i class="fas fa-check"></i></span>' : ''}
    </div>
  `;
  
  messagesContainer.appendChild(messageEl);
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateChatHeader(type, id) {
  // In a real app, you would fetch the user/community details
  const chatPartnerName = document.getElementById('chat-partner-name');
  const chatPartnerAvatar = document.getElementById('chat-partner-avatar');
  
  if (type === 'user') {
    chatPartnerName.textContent = 'User Name'; // Would be fetched from API
    chatPartnerAvatar.src = '../assets/images/default-avatar.jpg';
  } else {
    chatPartnerName.textContent = 'Community Name'; // Would be fetched from API
    chatPartnerAvatar.src = '../assets/images/community-default.jpg';
  }
}

function setupChatListeners() {
  // Send message
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  
  function sendMessage() {
    if (!currentConversation || !messageInput.value.trim()) return;
    
    const token = localStorage.getItem('token');
    const message = {
      type: currentConversation.type,
      id: currentConversation.id,
      message: messageInput.value.trim()
    };
    
    // Add message to chat immediately (optimistic update)
    const tempMessage = {
      message: messageInput.value.trim(),
      timestamp: new Date().toISOString(),
      sender_id: getUserIdFromToken(token)
    };
    addMessageToChat(tempMessage, 'outgoing');
    
    // Clear input
    messageInput.value = '';
    
    // Send to server
    fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      return response.json();
    })
    .catch(error => {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    });
  }
  
  // Send on button click
  sendBtn.addEventListener('click', sendMessage);
  
  // Send on Enter key
  messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Attach image
  const attachBtn = document.getElementById('attach-btn');
  const fileInput = document.getElementById('file-input');
  
  attachBtn.addEventListener('click', function() {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', this.files[0]);
      
      // Determine if this is a user or community message
      if (currentConversation) {
        formData.append('type', currentConversation.type);
        formData.append('id', currentConversation.id);
      }
      
      // Show loading state
      const messagesContainer = document.getElementById('messages-container');
      const loadingEl = document.createElement('div');
      loadingEl.className = 'message message-outgoing';
      loadingEl.innerHTML = `
        <div class="message-content">
          <i class="fas fa-spinner fa-spin"></i> Uploading image...
        </div>
      `;
      messagesContainer.appendChild(loadingEl);
      
      // Upload image
      fetch('/api/chat/send-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to send image');
        }
        return response.json();
      })
      .then(data => {
        // Replace loading with actual message
        loadingEl.innerHTML = `
          <img src="${data.image_url}" class="message-image" alt="Sent image">
          <div class="message-meta">
            <span class="message-time">Just now</span>
            <span class="message-status"><i class="fas fa-check"></i></span>
          </div>
        `;
      })
      .catch(error => {
        console.error('Error sending image:', error);
        loadingEl.innerHTML = `
          <div class="message-content" style="color: var(--danger-color);">
            Failed to send image
          </div>
        `;
      });
    }
  });
  
  // Toggle conversations sidebar on mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      document.querySelector('.conversations-sidebar').classList.toggle('active');
    });
  }
}

function updateUserInfo() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
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
    document.getElementById('user-avatar').src = data.profile_pic || '../assets/images/default-avatar.jpg';
    document.getElementById('username').textContent = data.username;
  })
  .catch(error => {
    console.error('Error loading user data:', error);
  });
}

function updateConversationList(message) {
  // Find the conversation in the list and update it
  const conversationItem = document.querySelector(`.conversation-item[data-type="user"][data-id="${message.sender_id}"]`);
  if (conversationItem) {
    const lastMessage = conversationItem.querySelector('.conversation-last-message');
    const time = conversationItem.querySelector('.conversation-time');
    const unread = conversationItem.querySelector('.conversation-unread');
    
    lastMessage.textContent = message.message || 'Image';
    time.textContent = formatTime(message.timestamp);
    
    if (unread) {
      unread.textContent = parseInt(unread.textContent) + 1;
    } else {
      const unreadEl = document.createElement('div');
      unreadEl.className = 'conversation-unread';
      unreadEl.textContent = '1';
      conversationItem.querySelector('.conversation-meta').appendChild(unreadEl);
    }
    
    // Move to top
    conversationItem.parentNode.prepend(conversationItem);
  }
}

function updateCommunityConversationList(message) {
  // Similar to updateConversationList but for communities
  const conversationItem = document.querySelector(`.conversation-item[data-type="community"][data-id="${message.community_id}"]`);
  if (conversationItem) {
    const lastMessage = conversationItem.querySelector('.conversation-last-message');
    const time = conversationItem.querySelector('.conversation-time');
    const unread = conversationItem.querySelector('.conversation-unread');
    
    lastMessage.textContent = `${message.sender_name}: ${message.message || 'Image'}`;
    time.textContent = formatTime(message.timestamp);
    
    if (unread) {
      unread.textContent = parseInt(unread.textContent) + 1;
    } else {
      const unreadEl = document.createElement('div');
      unreadEl.className = 'conversation-unread';
      unreadEl.textContent = '1';
      conversationItem.querySelector('.conversation-meta').appendChild(unreadEl);
    }
    
    // Move to top
    conversationItem.parentNode.prepend(conversationItem);
  }
}

function showNewMessageNotification(message) {
  let title, body;
  
  if (message.community_id) {
    title = message.community_name;
    body = `${message.sender_name}: ${message.message || 'Sent an image'}`;
  } else {
    title = message.sender_name;
    body = message.message || 'Sent an image';
  }
  
  showToast(body, 'info');
  
  // In a real app, you might use the Notifications API
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

function getLevelIcon(points) {
  if (!points) return '';
  
  if (points > 180) return '😊';
  if (points > 60) return '❤️';
  return '☮️';
}

function formatTime(timestamp) {
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

function getUserIdFromToken(token) {
  // In a real app, you would decode the JWT to get the user ID
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user.id;
  } catch (e) {
    console.error('Error decoding token:', e);
    return null;
  }
}