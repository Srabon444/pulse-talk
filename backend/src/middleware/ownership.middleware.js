import logger from '../config/logger.js';
import {prisma} from '../config/prisma.connection.js';


// Middleware to check if the authenticated user owns the comment

const checkCommentOwnership = async (req, res, next) => {
  try {
    const {id} = req.params;
    const userId = req.user.id;

    // Check if comment exists and get the author
    const comment = await prisma.comment.findUnique({
      where: {id},
      select: {authorId: true}
    });

    if (!comment) {
      logger.warn(`Comment not found: ${id}`);
      return res.status(404).json({
        error: 'Comment not found'
      });
    }

    // Check if user owns the comment
    if (comment.authorId !== userId) {
      logger.warn(`User ${userId} attempted to access comment ${id} owned by ${comment.authorId}`);
      return res.status(403).json({
        error: 'You can only modify your own comments'
      });
    }

    // Add comment info to request for use in controller
    req.comment = comment;
    next();
  } catch (error) {
    logger.error(`Comment ownership check failed: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to verify comment ownership'
    });
  }
};

export {
  checkCommentOwnership
};