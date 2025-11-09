import {prisma} from '../config/prisma.connection.js';
import {cacheService, cacheKeys} from './cache.service.js';
import logger from '../config/logger.js';
import {
  broadcastNewComment,
  broadcastCommentUpdate,
  broadcastCommentDelete,
  broadcastVoteUpdate
} from './socket.service.js';

// Helper function to build nested replies with depth control
const buildNestedReplies = (depth = 3) => {
  if (depth <= 0) {
    return {
      include: {
        author: {select: {id: true, username: true, email: true}},
        _count: {select: {likes: true, replies: true}}
      },
      orderBy: {createdAt: 'asc'}
    };
  }

  return {
    include: {
      author: {select: {id: true, username: true, email: true}},
      _count: {select: {likes: true, replies: true}},
      replies: buildNestedReplies(depth - 1)
    },
    orderBy: {createdAt: 'asc'}
  };
};

// Helper function to enhance comments with vote data
const enhanceCommentsWithVotes = async (comments, userId = null) => {
  if (!comments || comments.length === 0) return comments;

  const commentsArray = Array.isArray(comments) ? comments : [comments];

  for (let comment of commentsArray) {
    // Get vote counts
    const voteCounts = await getVoteCounts(comment.id);
    comment.voteCounts = voteCounts;

    // Get user's vote status if user is authenticated
    if (userId) {
      comment.userVote = await getUserVoteStatus(comment.id, userId);
    }

    // Process replies recursively
    if (comment.replies && comment.replies.length > 0) {
      comment.replies = await enhanceCommentsWithVotes(comment.replies, userId);
    }
  }

  return Array.isArray(comments) ? commentsArray : commentsArray[0];
};

export const getComments = async (queryParams, userId = null) => {
  try {
    const {page = 1, limit = 10, sortBy = 'newest', depth = 3} = queryParams;
    const skip = (page - 1) * limit;

    // For authenticated users, we don't cache to ensure real-time vote status
    const shouldCache = !userId;
    const cacheKey = cacheKeys.commentsList(page, limit, sortBy);

    if (shouldCache) {
      const cachedComments = await cacheService.get(cacheKey);
      if (cachedComments) {
        logger.info(`Comments retrieved from cache for page ${page}`);
        return {
          success: true,
          data: cachedComments
        };
      }
    }

    // Get total count for pagination
    const totalComments = await prisma.comment.count({
      where: {
        parentId: null // Only count top-level comments
      }
    });

    let comments;

    // Handle different sorting options
    if (sortBy === 'likes' || sortBy === 'dislikes') {
      const isLikeValue = sortBy === 'likes';

      // Get counts per comment where isLike matches (true for likes, false for dislikes)
      const grouped = await prisma.like.groupBy({
        by: ['commentId'],
        where: {isLike: isLikeValue},
        _count: {
          commentId: true
        }
      });

      // Sort the groups by count desc
      grouped.sort((a, b) => b._count.commentId - a._count.commentId);

      // Extract ordered commentIds
      const orderedLikedIds = grouped.map(g => g.commentId);

      // For pagination: compute slice of IDs that correspond to the requested page
      const start = skip;
      const end = skip + limit;

      // Prepare list of commentIds to fetch for this page
      let pageCommentIds = orderedLikedIds.slice(start, end);

      // If not enough (because many comments have zero matching votes), fill with other top-level comments TODO: Need to simplify, try before final submission
      if (pageCommentIds.length < limit) {
        // How many more we need
        const needed = limit - pageCommentIds.length;

        // Fetch other top-level comment IDs excluding the ones we already have, ordered by createdAt desc
        const otherComments = await prisma.comment.findMany({
          where: {
            parentId: null,
            id: {notIn: orderedLikedIds}
          },
          orderBy: {createdAt: 'desc'},
          select: {id: true},
          take: needed,
          skip: 0
        });

        pageCommentIds = pageCommentIds.concat(otherComments.map(c => c.id));
      }

      // Fetch complete comment data preserving order
      if (pageCommentIds.length > 0) {
        const fetched = await prisma.comment.findMany({
          where: {id: {in: pageCommentIds}, parentId: null},
          include: {
            author: {select: {id: true, username: true, email: true}},
            replies: buildNestedReplies(depth - 1),
            _count: {select: {likes: true, replies: true}}
          }
        });

        // Preserve ordering from pageCommentIds
        comments = pageCommentIds.map(id => fetched.find(f => f.id === id)).filter(Boolean);
      } else {
        comments = [];
      }
    } else {
      // Handle createdAt sorting (newest/oldest)
      const orderBy = sortBy === 'oldest' ? {createdAt: 'asc'} : {createdAt: 'desc'};

      comments = await prisma.comment.findMany({
        where: {
          parentId: null // Only get top-level comments
        },
        include: {
          author: {select: {id: true, username: true, email: true}},
          replies: buildNestedReplies(depth - 1),
          _count: {select: {likes: true, replies: true}}
        },
        orderBy,
        skip,
        take: limit
      });
    }

    // Enhance comments with vote data
    const enhancedComments = await enhanceCommentsWithVotes(comments, userId);

    const totalPages = Math.ceil(totalComments / limit);

    const result = {
      comments: enhancedComments,
      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        itemsPerPage: limit,
        itemsOnPage: enhancedComments.length,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
        firstPage: 1,
        lastPage: totalPages
      }
    };

    // Cache the result for 5 minutes (only for non-authenticated requests)
    if (shouldCache) {
      await cacheService.set(cacheKey, result, 300);
    }

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

    // Broadcast new comment/reply to connected clients
    broadcastNewComment(newComment, parentId);

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

export const getCommentById = async (commentId, userId = null, depth = 3) => {
  try {
    // For authenticated users, we don't cache to ensure real-time vote status
    const shouldCache = !userId;
    const cacheKey = cacheKeys.commentDetails(commentId);

    if (shouldCache) {
      const cachedComment = await cacheService.get(cacheKey);
      if (cachedComment) {
        logger.info(`Comment details retrieved from cache for ID: ${commentId}`);
        return {
          success: true,
          data: cachedComment
        };
      }
    }

    const comment = await prisma.comment.findUnique({
      where: {id: commentId},
      include: {
        author: {select: {id: true, username: true, email: true}},
        replies: buildNestedReplies(depth - 1),
        _count: {select: {likes: true, replies: true}}
      }
    });

    if (!comment) {
      return {
        success: false,
        message: 'Comment not found'
      };
    }

    // Enhance comment with vote data
    const enhancedComment = await enhanceCommentsWithVotes(comment, userId);

    // Cache the result for 10 minutes (only for non-authenticated requests)
    if (shouldCache) {
      await cacheService.set(cacheKey, enhancedComment, 600);
    }

    return {
      success: true,
      data: enhancedComment
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

    // Broadcast comment update to connected clients
    broadcastCommentUpdate(updatedComment);

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

    // Broadcast comment deletion to connected clients
    const isHardDelete = comment._count.replies === 0;
    broadcastCommentDelete(commentId, isHardDelete);

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

export const toggleLike = async (commentId, userId, isLike) => {
  try {
    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: {id: commentId}
    });

    if (!comment) {
      return {
        success: false,
        message: 'Comment not found'
      };
    }

    // Check if user already has a vote on this comment
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId
        }
      }
    });

    let result;

    if (existingLike) {
      if (existingLike.isLike === isLike) {
        // Same action - remove the vote
        await prisma.like.delete({
          where: {id: existingLike.id}
        });

        result = {
          action: 'removed',
          previousVote: isLike ? 'like' : 'dislike'
        };
        logger.info(`Vote removed from comment ${commentId} by user ${userId}`);
      } else {
        // Different action - update the vote
        const updatedLike = await prisma.like.update({
          where: {id: existingLike.id},
          data: {isLike}
        });

        result = {
          action: 'updated',
          newVote: isLike ? 'like' : 'dislike',
          previousVote: existingLike.isLike ? 'like' : 'dislike'
        };
        logger.info(`Vote updated on comment ${commentId} by user ${userId}: ${isLike ? 'like' : 'dislike'}`);
      }
    } else {
      // No existing vote - create new
      const newLike = await prisma.like.create({
        data: {
          userId,
          commentId,
          isLike
        }
      });

      result = {
        action: 'created',
        newVote: isLike ? 'like' : 'dislike'
      };
      logger.info(`New vote created on comment ${commentId} by user ${userId}: ${isLike ? 'like' : 'dislike'}`);
    }

    // Get updated vote counts
    const voteCounts = await getVoteCounts(commentId);

    // Clear relevant caches
    await cacheService.del(cacheKeys.commentDetails(commentId));
    await cacheService.delPattern('comments:list:*');

    // Broadcast vote update to connected clients
    broadcastVoteUpdate(commentId, {...result, voteCounts}, userId);

    return {
      success: true,
      data: {
        ...result,
        voteCounts
      },
      message: 'Vote processed successfully'
    };

  } catch (error) {
    logger.error(`Failed to process vote: ${error.message}`);
    return {
      success: false,
      message: 'Failed to process vote'
    };
  }
};

export const getVoteCounts = async (commentId) => {
  try {
    const counts = await prisma.like.groupBy({
      by: ['isLike'],
      where: {commentId},
      _count: {
        isLike: true
      }
    });

    let likes = 0;
    let dislikes = 0;

    counts.forEach(count => {
      if (count.isLike === true) {
        likes = count._count.isLike;
      } else if (count.isLike === false) {
        dislikes = count._count.isLike;
      }
    });

    return {
      likes,
      dislikes,
      total: likes + dislikes
    };

  } catch (error) {
    logger.error(`Failed to get vote counts for comment ${commentId}: ${error.message}`);
    return {
      likes: 0,
      dislikes: 0,
      total: 0
    };
  }
};

export const getUserVoteStatus = async (commentId, userId) => {
  try {
    if (!userId) {
      return null;
    }

    const userVote = await prisma.like.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId
        }
      },
      select: {
        isLike: true
      }
    });

    if (!userVote) {
      return null;
    }

    return userVote.isLike ? 'like' : 'dislike';

  } catch (error) {
    logger.error(`Failed to get user vote status: ${error.message}`);
    return null;
  }
};