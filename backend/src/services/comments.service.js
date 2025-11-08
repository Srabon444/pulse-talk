import {prisma} from '../config/prisma.connection.js';
import {cacheService, cacheKeys} from './cache.service.js';
import logger from '../config/logger.js';

export const getComments = async (queryParams) => {
  try {
    const {page = 1, limit = 10, sortBy = 'newest'} = queryParams;
    const skip = (page - 1) * limit;

    // Check cache first
    const cacheKey = cacheKeys.commentsList(page, limit, sortBy);
    const cachedComments = await cacheService.get(cacheKey);

    if (cachedComments) {
      logger.info(`Comments retrieved from cache for page ${page}`);
      return {
        success: true,
        data: cachedComments
      };
    }

    // Build the orderBy object based on sortBy parameter
    const orderBy = sortBy === 'oldest' ? {createdAt: 'asc'} : {createdAt: 'desc'};

    // Get total count for pagination
    const totalComments = await prisma.comment.count({
      where: {
        parentId: null // Only count top-level comments
      }
    });

    // Get comments with nested replies
    const comments = await prisma.comment.findMany({
      where: {
        parentId: null // Only get top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            _count: {
              select: {
                likes: true
              }
            }
          },
          orderBy: {createdAt: 'asc'}
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    });

    const result = {
      comments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalComments / limit),
        totalComments,
        hasNext: page < Math.ceil(totalComments / limit),
        hasPrev: page > 1
      }
    };

    // Cache the result for 5 minutes
    await cacheService.set(cacheKey, result, 300);

    logger.info(`Retrieved ${comments.length} comments for page ${page}`);
    return {
      success: true,
      data: result
    };

  } catch (error) {
    logger.error(`Failed to get comments: ${error.message}`);
    return {
      success: false,
      message: 'Failed to retrieve comments'
    };
  }
};

export const createComment = async (commentData, userId) => {
  try {
    const {content, parentId} = commentData;

    // If parentId is provided, check if parent comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: {id: parentId}
      });

      if (!parentComment) {
        return {
          success: false,
          message: 'Parent comment not found'
        };
      }
    }

    // Create the comment
    const newComment = await prisma.comment.create({
      data: {
        content,
        authorId: userId,
        parentId: parentId || null
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    // Invalidate relevant caches
    await cacheService.delPattern('comments:list:*');
    if (parentId) {
      await cacheService.del(cacheKeys.commentReplies(parentId));
    }

    logger.info(`Comment created successfully, CommentId: ${newComment.id}, AuthorId: ${userId}`);

    return {
      success: true,
      data: newComment,
      message: 'Comment created successfully'
    };

  } catch (error) {
    logger.error(`Failed to create comment: ${error.message}`);
    return {
      success: false,
      message: 'Failed to create comment'
    };
  }
};

export const getCommentById = async (commentId) => {
  try {
    // Check cache first
    const cacheKey = cacheKeys.commentDetails(commentId);
    const cachedComment = await cacheService.get(cacheKey);

    if (cachedComment) {
      logger.info(`Comment details retrieved from cache for ID: ${commentId}`);
      return {
        success: true,
        data: cachedComment
      };
    }

    const comment = await prisma.comment.findUnique({
      where: {id: commentId},
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            _count: {
              select: {
                likes: true
              }
            }
          },
          orderBy: {createdAt: 'asc'}
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    if (!comment) {
      return {
        success: false,
        message: 'Comment not found'
      };
    }

    // Cache the result for 10 minutes
    await cacheService.set(cacheKey, comment, 600);

    return {
      success: true,
      data: comment
    };

  } catch (error) {
    logger.error(`Failed to get comment by ID ${commentId}: ${error.message}`);
    return {
      success: false,
      message: 'Failed to retrieve comment'
    };
  }
};

export const updateComment = async (commentId, updateData) => {
  try {
    const updatedComment = await prisma.comment.update({
      where: {id: commentId},
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    // Clear cache for this comment and related lists
    await cacheService.del(cacheKeys.commentDetails(commentId));
    await cacheService.delPattern('comments:list:*');

    if (updatedComment.parentId) {
      await cacheService.del(cacheKeys.commentReplies(updatedComment.parentId));
    }

    logger.info(`Comment updated successfully: ${commentId}`);
    return {
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully'
    };
  } catch (error) {
    logger.error(`Failed to update comment: ${error.message}`);
    return {
      success: false,
      message: 'Failed to update comment'
    };
  }
};

export const deleteComment = async (commentId) => {
  try {
    // First check if comment has replies
    const comment = await prisma.comment.findUnique({
      where: {id: commentId},
      include: {
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    if (!comment) {
      return {
        success: false,
        message: 'Comment not found'
      };
    }

    let result;
    // If comment has replies, mark as deleted instead of hard delete
    if (comment._count.replies > 0) {
      result = await prisma.comment.update({
        where: {id: commentId},
        data: {
          content: '[deleted]'
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          _count: {
            select: {
              likes: true,
              replies: true
            }
          }
        }
      });
      logger.info(`Comment soft deleted (has replies): ${commentId}`);
    } else {
      // Hard delete if no replies
      await prisma.comment.delete({
        where: {id: commentId}
      });
      result = {id: commentId, deleted: true};
      logger.info(`Comment hard deleted: ${commentId}`);
    }

    // Clear cache
    await cacheService.del(cacheKeys.commentDetails(commentId));
    await cacheService.delPattern('comments:list:*');

    if (comment.parentId) {
      await cacheService.del(cacheKeys.commentReplies(comment.parentId));
    }

    return {
      success: true,
      data: result,
      message: 'Comment deleted successfully'
    };
  } catch (error) {
    logger.error(`Failed to delete comment: ${error.message}`);
    return {
      success: false,
      message: 'Failed to delete comment'
    };
  }
};