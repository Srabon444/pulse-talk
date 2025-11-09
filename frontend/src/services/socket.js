import {io} from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.listeners = new Map(); // Store event listeners for cleanup
  }

  // Initialize socket connection
  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    const socketUrl = import.meta.env.DEV
      ? 'http://localhost:3000'
      : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000');


    this.socket = io(socketUrl, {
      auth: {
        token: token
      },
      query: {
        token: token // fallback
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true
    });

    this.setupEventListeners();
    return this.socket;
  }

  // Set up socket event listeners
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      // Join the general comments room
      this.joinCommentsRoom();
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;

      // Attempt reconnection for client-side disconnections
      if (reason !== 'io server disconnect') {
        // Client-side disconnect, attempt reconnection
        this.attemptReconnection();
      }
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
      this.attemptReconnection();
    });

    // Authentication events
    this.socket.on('error', () => {
      // Socket error occurred
    });
  }

  // Attempt to reconnect with exponential backoff
  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.isConnected && this.socket) {
        this.socket.connect();
      }
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  // Join the general comments room
  joinCommentsRoom() {
    if (this.socket?.connected) {
      // The backend automatically joins users to 'comments' room on connection
    }
  }

  // Listen for new comments
  onNewComment(callback) {
    if (this.socket) {
      this.socket.on('comment_created', callback);
      this.listeners.set('comment_created', callback);
    }
  }

  // Listen for comment updates
  onCommentUpdate(callback) {
    if (this.socket) {
      this.socket.on('comment_updated', callback);
      this.listeners.set('comment_updated', callback);
    }
  }

  // Listen for comment deletions
  onCommentDelete(callback) {
    if (this.socket) {
      this.socket.on('comment_deleted', callback);
      this.listeners.set('comment_deleted', callback);
    }
  }

  // Listen for vote updates
  onVoteUpdate(callback) {
    if (this.socket) {
      this.socket.on('vote_updated', callback);
      this.listeners.set('vote_updated', callback);
    }
  }

  // Listen for new replies to a specific comment
  onNewReply(callback) {
    if (this.socket) {
      this.socket.on('reply_added', callback);
      this.listeners.set('reply_added', callback);
    }
  }

  // Remove all event listeners
  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callback, event) => {
        this.socket.off(event, callback);
      });
      this.listeners.clear();
    }
  }

  // Remove specific event listener
  removeListener(event) {
    if (this.socket && this.listeners.has(event)) {
      const callback = this.listeners.get(event);
      this.socket.off(event, callback);
      this.listeners.delete(event);
    }
  }

  // Get connection status
  isSocketConnected() {
    return this.socket?.connected || false;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }
}

const socketService = new SocketService();

export default socketService;