import express from 'express';
import {getAllComments, createNewComment, getCommentDetails} from '../controllers/comments.controller.js';
import {authenticateToken, optionalAuth} from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes - anyone can view comments, but logged-in users get enhanced data
router.get('/', optionalAuth, getAllComments);
router.get('/:id', optionalAuth, getCommentDetails);

// Protected routes
router.post('/', authenticateToken, createNewComment);

export default router;