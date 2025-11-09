import {useState, useEffect, useCallback} from 'react';
import Comment from './Comment';
import {commentsAPI} from '../services/api';
import socketService from '../services/socket';
import useAuthStore from '../store/authStore';

const CommentList = () => {
  const {isAuthenticated} = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalComments: 0,
    itemsPerPage: 10
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

  // Helper function to update a specific comment in the nested list
  const updateCommentInList = useCallback((commentId, updatedData) => {
    setComments(prevComments => {
      const updateComment = (commentsList) => {
        return commentsList.map(comment => {
          if (comment.id === commentId) {
            return {...comment, ...updatedData};
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
      return updateComment(prevComments);
    });
  }, []);

  // Socket integration for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    // Try to reconnect if not connected
    const {user} = useAuthStore.getState();
    if (user?.token && !socketService.isSocketConnected()) {
      socketService.connect(user.token);
    }

    // Set up socket event listeners for real-time updates
    const handleNewComment = (eventData) => {
      const {comment, type, parentId} = eventData;

      if (type === 'new_comment' && !parentId) {
        // Add new root comment to the beginning of the list
        setComments(prevComments => [comment, ...prevComments]);

        // Update pagination count
        setPagination(prev => ({
          ...prev,
          totalComments: prev.totalComments + 1
        }));
      } else if (type === 'new_reply' && parentId) {
        // Handle reply in the same way as handleNewReply
        setComments(prevComments => {
          const addReply = (comments) => {
            return comments.map(existingComment => {
              if (existingComment.id === parentId) {
                return {
                  ...existingComment,
                  replies: [...(existingComment.replies || []), comment]
                };
              }
              if (existingComment.replies && existingComment.replies.length > 0) {
                return {
                  ...existingComment,
                  replies: addReply(existingComment.replies)
                };
              }
              return existingComment;
            });
          };
          return addReply(prevComments);
        });
      }
    };

    const handleCommentUpdate = (eventData) => {
      const {comment} = eventData;
      updateCommentInList(comment.id, comment);
    };

    const handleCommentDelete = (eventData) => {
      const {commentId} = eventData;

      setComments(prevComments => {
        const removeComment = (comments) => {
          return comments.filter(comment => {
            if (comment.id === commentId) {
              return false;
            }
            if (comment.replies && comment.replies.length > 0) {
              comment.replies = removeComment(comment.replies);
            }
            return true;
          });
        };
        return removeComment(prevComments);
      });

      // Update pagination count
      setPagination(prev => ({
        ...prev,
        totalComments: Math.max(0, prev.totalComments - 1)
      }));
    };

    const handleVoteUpdate = (eventData) => {
      const {commentId, voteData, userId: eventUserId} = eventData;
      const {user} = useAuthStore.getState();

      setComments(prevComments => {
        const updateVotes = (comments) => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              // Calculate user's current vote based on the event
              let userVote = null;
              if (eventUserId === user?.id) {
                if (voteData.action === 'removed') {
                  userVote = null;
                } else if (voteData.newVote === 'like') {
                  userVote = 'like';
                } else if (voteData.newVote === 'dislike') {
                  userVote = 'dislike';
                }
              } else {
                // Keep existing user vote for other users' actions
                userVote = comment.userVote;
              }

              return {
                ...comment,
                voteCounts: {
                  likes: voteData.voteCounts?.likes || 0,
                  dislikes: voteData.voteCounts?.dislikes || 0,
                  total: voteData.voteCounts?.total || 0
                },
                userVote
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateVotes(comment.replies)
              };
            }
            return comment;
          });
        };
        return updateVotes(prevComments);
      });
    };

    const handleNewReply = (eventData) => {
      const {comment, parentId} = eventData;

      if (parentId && comment) {
        setComments(prevComments => {
          const addReply = (comments) => {
            return comments.map(existingComment => {
              if (existingComment.id === parentId) {
                return {
                  ...existingComment,
                  replies: [...(existingComment.replies || []), comment]
                };
              }
              if (existingComment.replies && existingComment.replies.length > 0) {
                return {
                  ...existingComment,
                  replies: addReply(existingComment.replies)
                };
              }
              return existingComment;
            });
          };
          return addReply(prevComments);
        });
      }
    };

    // Register socket event listeners
    socketService.onNewComment(handleNewComment);
    socketService.onCommentUpdate(handleCommentUpdate);
    socketService.onCommentDelete(handleCommentDelete);
    socketService.onVoteUpdate(handleVoteUpdate);
    socketService.onNewReply(handleNewReply);

    // Cleanup function
    return () => {
      socketService.removeListener('comment_created');
      socketService.removeListener('comment_updated');
      socketService.removeListener('comment_deleted');
      socketService.removeListener('vote_updated');
      socketService.removeListener('reply_added');
    };
  }, [isAuthenticated, updateCommentInList]);

  // Handle sorting change
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  // Handle page change
  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= pagination.totalPages && !loading) {
      loadComments(pageNumber, true);
    }
  };

  // Generate simple page numbers for pagination
  const generatePageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= pagination.totalPages; i++) {
      pages.push(i);
    }
    return pages;
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

  // Handle edit comment
  const handleEdit = async (commentId, newContent) => {
    try {
      const result = await commentsAPI.updateComment(commentId, {content: newContent});

      if (result.success) {
        // Update the comment in the local state
        const updateCommentInTree = (comments) => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {...comment, content: newContent, updatedAt: new Date().toISOString()};
            }
            if (comment.replies && comment.replies.length > 0) {
              return {...comment, replies: updateCommentInTree(comment.replies)};
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

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <div className="pagination__info">
              <span className="pagination__text">
                Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalComments} total comments
              </span>
            </div>

            <div className="pagination__controls">
              {/* Previous Button */}
              <button
                className="pagination__btn pagination__btn--prev"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1 || loading}
              >
                ← Prev
              </button>

              {/* Page Numbers */}
              <div className="pagination__pages">
                {generatePageNumbers().map((pageNum, index) => (
                  <button
                    key={index}
                    className={`pagination__page ${
                      pageNum === pagination.currentPage ? 'pagination__page--active' : ''
                    } ${pageNum === '...' ? 'pagination__page--ellipsis' : ''}`}
                    onClick={() => pageNum !== '...' && handlePageChange(pageNum)}
                    disabled={pageNum === '...' || loading}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              {/* Next Button */}
              <button
                className="pagination__btn pagination__btn--next"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages || loading}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentList;