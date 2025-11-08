import express from 'express';
import {
  getAllComments,
  createNewComment,
  getCommentDetails,
  updateCommentContent,
  deleteCommentById
} from '../controllers/comments.controller.js';
import {authenticateToken, optionalAuth} from '../middleware/auth.middleware.js';
import {checkCommentOwnership} from '../middleware/ownership.middleware.js';

const router = express.Router();

// Public routes - anyone can view comments, but logged-in users get enhanced data
router.get('/', optionalAuth, getAllComments);
router.get('/:id', optionalAuth, getCommentDetails);

// Protected routes
router.post('/', authenticateToken, createNewComment);

// Owner-only routes (must be authenticated and own the comment)
router.put('/:id', authenticateToken, checkCommentOwnership, updateCommentContent);
router.delete('/:id', authenticateToken, checkCommentOwnership, deleteCommentById);

export default router;