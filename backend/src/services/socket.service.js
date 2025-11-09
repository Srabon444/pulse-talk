import {Server} from 'socket.io';
import {verifyToken} from '../utils/jwt.utils.js';
import logger from '../config/logger.js';

let io = null;

// Initialize Socket.io server
export const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    try {
      // Get token from handshake auth or query
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        logger.warn(`Socket connection rejected: No authentication token provided`);
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const result = verifyToken(token);
      if (!result.success) {
        logger.warn(`Socket connection rejected: Invalid token`);
        return next(new Error('Invalid authentication token'));
      }

      // Attach user info to socket
      socket.userId = result.data.userId;
      socket.userEmail = result.data.email;

      logger.info(`Socket authenticated for user: ${socket.userId}`);
      next();
    } catch (error) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userId} (Socket: ${socket.id})`);

    // Join user to their personal room (for targeted messages)
    socket.join(`user_${socket.userId}`);

    // Join general comments room
    socket.join('comments');

    // Handle joining specific comment threads
    socket.on('join_comment', (commentId) => {
      if (commentId && typeof commentId === 'string') {
        socket.join(`comment_${commentId}`);
        logger.debug(`User ${socket.userId} joined comment room: ${commentId}`);
      }
    });

    // Handle leaving comment threads
    socket.on('leave_comment', (commentId) => {
      if (commentId && typeof commentId === 'string') {
        socket.leave(`comment_${commentId}`);
        logger.debug(`User ${socket.userId} left comment room: ${commentId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${socket.userId} (${reason})`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userId}: ${error.message}`);
    });
  });

  logger.info('Socket.io server initialized successfully');
  return io;
};

// Get the io instance
export const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.io server not initialized. Call initSocketServer first.');
  }
  return io;
};

// Broadcast new comment to all connected clients
export const broadcastNewComment = (comment, parentId = null) => {
  try {
    if (!io) return;

    const eventData = {
      type: parentId ? 'new_reply' : 'new_comment',
      comment,
      parentId,
      timestamp: new Date().toISOString()
    };

    // Broadcast to general comments room
    io.to('comments').emit('comment_created', eventData);

    // If it's a reply, also broadcast to parent comment room
    if (parentId) {
      io.to(`comment_${parentId}`).emit('reply_added', eventData);
    }

    logger.debug(`Broadcasted ${eventData.type}: ${comment.id}`);
  } catch (error) {
    logger.error(`Error broadcasting new comment: ${error.message}`);
  }
};

// Broadcast comment update to connected clients
export const broadcastCommentUpdate = (comment) => {
  try {
    if (!io) return;

    const eventData = {
      type: 'comment_updated',
      comment,
      timestamp: new Date().toISOString()
    };

    // Broadcast to general comments room and specific comment room
    io.to('comments').emit('comment_updated', eventData);
    io.to(`comment_${comment.id}`).emit('comment_updated', eventData);

    logger.debug(`Broadcasted comment update: ${comment.id}`);
  } catch (error) {
    logger.error(`Error broadcasting comment update: ${error.message}`);
  }
};

// Broadcast comment deletion to connected clients
export const broadcastCommentDelete = (commentId, isHardDelete = false) => {
  try {
    if (!io) return;

    const eventData = {
      type: isHardDelete ? 'comment_deleted' : 'comment_soft_deleted',
      commentId,
      timestamp: new Date().toISOString()
    };

    // Broadcast to general comments room and specific comment room
    io.to('comments').emit('comment_deleted', eventData);
    io.to(`comment_${commentId}`).emit('comment_deleted', eventData);

    logger.debug(`Broadcasted comment deletion: ${commentId} (hard: ${isHardDelete})`);
  } catch (error) {
    logger.error(`Error broadcasting comment deletion: ${error.message}`);
  }
};

// Broadcast vote (like/dislike) update to connected clients
export const broadcastVoteUpdate = (commentId, voteData, userId) => {
  try {
    if (!io) return;

    const eventData = {
      type: 'vote_updated',
      commentId,
      voteData,
      userId,
      timestamp: new Date().toISOString()
    };

    // Broadcast to general comments room and specific comment room
    io.to('comments').emit('vote_updated', eventData);
    io.to(`comment_${commentId}`).emit('vote_updated', eventData);

    logger.debug(`Broadcasted vote update for comment: ${commentId}`);
  } catch (error) {
    logger.error(`Error broadcasting vote update: ${error.message}`);
  }
};

// Get connected users count
export const getConnectedUsersCount = () => {
  try {
    if (!io) return 0;
    return io.sockets.sockets.size;
  } catch (error) {
    logger.error(`Error getting connected users count: ${error.message}`);
    return 0;
  }
};

// Get users in a specific room
export const getRoomUsersCount = (roomName) => {
  try {
    if (!io) return 0;
    const room = io.sockets.adapter.rooms.get(roomName);
    return room ? room.size : 0;
  } catch (error) {
    logger.error(`Error getting room users count: ${error.message}`);
    return 0;
  }
};