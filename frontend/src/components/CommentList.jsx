import { useState, useEffect, useCallback } from 'react';
import Comment from './Comment';
import { commentsAPI } from '../services/api';

const CommentList = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalComments: 0
  });
  const [sortBy, setSortBy] = useState('newest');

  const COMMENTS_LIMIT = 10;

  // Load comments
  const loadComments = useCallback(async (page = 1, resetList = false) => {
    try {
      setLoading(true);
      setError('');

      const response = await commentsAPI.getComments({
        page,
        limit: COMMENTS_LIMIT,
        sortBy
      });

      if (response.success) {
        if (resetList) {
          setComments(response.data.comments);
        } else {
          setComments(prevComments => [...prevComments, ...response.data.comments]);
        }
        setPagination(response.data.pagination);
      } else {
        setError(response.message || 'Failed to load comments');
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setError('An error occurred while loading comments');
    } finally {
      setLoading(false);
    }
  }, [sortBy, COMMENTS_LIMIT]);

  // Load comments on component mount and when sort changes
  useEffect(() => {
    loadComments(1, true);
  }, [loadComments]);

  // Handle sorting change
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages && !loading) {
      loadComments(pagination.page + 1);
    }
  };

  // Handle reply to comment
  const handleReply = async (parentId, content) => {
    try {
      const response = await commentsAPI.replyToComment(parentId, content);
      
      if (response.success) {
        // Refresh comments to show new reply
        loadComments(1, true);
      } else {
        setError(response.message || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      setError('An error occurred while posting reply');
    }
  };

  // Handle like comment
  const handleLike = async (commentId) => {
    try {
      const response = await commentsAPI.likeComment(commentId);
      
      if (response.success) {
        // Update the specific comment in the list
        updateCommentInList(commentId, response.data);
      } else {
        setError(response.message || 'Failed to like comment');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      setError('An error occurred while liking comment');
    }
  };

  // Handle dislike comment
  const handleDislike = async (commentId) => {
    try {
      const response = await commentsAPI.dislikeComment(commentId);
      
      if (response.success) {
        // Update the specific comment in the list
        updateCommentInList(commentId, response.data);
      } else {
        setError(response.message || 'Failed to dislike comment');
      }
    } catch (error) {
      console.error('Error disliking comment:', error);
      setError('An error occurred while disliking comment');
    }
  };

  // Helper function to update a specific comment in the nested list
  const updateCommentInList = (commentId, updatedData) => {
    const updateComment = (commentsList) => {
      return commentsList.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, ...updatedData };
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateComment(comment.replies)
          };
        }
        return comment;
      });
    };

    setComments(updateComment(comments));
  };

  // Handle edit comment
  const handleEdit = async (commentId, newContent) => {
    try {
      const result = await commentsAPI.updateComment(commentId, { content: newContent });
      
      if (result.success) {
        // Update the comment in the local state
        const updateCommentInTree = (comments) => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, content: newContent, updatedAt: new Date().toISOString() };
            }
            if (comment.replies && comment.replies.length > 0) {
              return { ...comment, replies: updateCommentInTree(comment.replies) };
            }
            return comment;
          });
        };
        
        setComments(updateCommentInTree(comments));
      } else {
        console.error('Failed to update comment:', result.message);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  // Handle delete comment (placeholder for future implementation)
  const handleDelete = async (commentId) => {
    try {
      const response = await commentsAPI.deleteComment(commentId);
      
      if (response.success) {
        // Refresh comments to remove deleted comment
        loadComments(1, true);
      } else {
        setError(response.message || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('An error occurred while deleting comment');
    }
  };

  return (
    <div className="comment-list">
      <div className="comment-list__header">
        <h2 className="comment-list__title">
          Comments ({pagination.totalComments})
        </h2>
        
        <div className="comment-list__controls">
          <label className="comment-list__sort-label">
            Sort by:
            <select 
              className="comment-list__sort-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="likes">Most Liked</option>
              <option value="dislikes">Most Disliked</option>
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="comment-list__error">
          {error}
        </div>
      )}

      <div className="comment-list__content">
        {comments.length === 0 && !loading ? (
          <div className="comment-list__empty">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="comment-list__items">
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onLike={handleLike}
                onDislike={handleDislike}
                onEdit={handleEdit}
                onDelete={handleDelete}
                depth={0}
                maxDepth={3}
              />
            ))}
          </div>
        )}

        {loading && (
          <div className="comment-list__loading">
            Loading comments...
          </div>
        )}

        {pagination.page < pagination.totalPages && !loading && (
          <button 
            className="comment-list__load-more"
            onClick={handleLoadMore}
          >
            Load More Comments
          </button>
        )}
      </div>
    </div>
  );
};

export default CommentList;