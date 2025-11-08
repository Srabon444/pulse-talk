import {getComments, createComment, getCommentById} from '../services/comments.service.js';
import {createCommentSchema, getCommentsQuerySchema, commentIdSchema} from '../schemas/comment.schemas.js';
import logger from '../config/logger.js';

export const getAllComments = async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = getCommentsQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        errors: validationResult.error.errors
      });
    }

    const result = await getComments(validationResult.data);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    logger.error(`Get comments controller error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const createNewComment = async (req, res) => {
  try {
    // Validate request data
    const validationResult = createCommentSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        errors: validationResult.error.errors
      });
    }

    const userId = req.user.userId;
    const result = await createComment(validationResult.data, userId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    logger.error(`Create comment controller error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getCommentDetails = async (req, res) => {
  try {
    // Validate comment ID parameter
    const validationResult = commentIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        errors: validationResult.error.errors
      });
    }

    const result = await getCommentById(validationResult.data.id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    logger.error(`Get comment details controller error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};