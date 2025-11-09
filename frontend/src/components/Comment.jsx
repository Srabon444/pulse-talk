import {useState} from 'react';
import useAuthStore from '../store/authStore';

const Comment = ({
                   comment,
                   onReply,
                   onLike,
                   onDislike,
                   onEdit,
                   onDelete,
                   depth = 0,
                   maxDepth = 3
                 }) => {
  const {user, isAuthenticated} = useAuthStore();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwner = isAuthenticated && user?.id === comment.authorId;
  const canNest = depth < maxDepth;

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    await onReply(comment.id, replyContent.trim());
    setReplyContent('');
    setIsReplying(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleLike = () => {
    if (!isAuthenticated) return;
    onLike(comment.id);
  };

  const handleDislike = () => {
    if (!isAuthenticated) return;
    onDislike(comment.id);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) return;

    await onEdit(comment.id, editContent.trim());
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div className={`comment ${depth > 0 ? 'comment--reply' : 'comment--root'}`}>
      <div className="comment__content">
        <div className="comment__header">
          <div className="comment__author">
            <span className="comment__username">@{comment.author.username}</span>
            <span className="comment__timestamp">{formatDate(comment.createdAt)}</span>
          </div>
          {isOwner && (
            <div className="comment__actions">
              <button
                className="comment__action-btn comment__action-btn--edit"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
              <button
                className="comment__action-btn comment__action-btn--delete"
                onClick={() => onDelete?.(comment.id)}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="comment__edit-form">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="comment__edit-textarea"
              rows="3"
              maxLength="2000"
              required
            />
            <div className="comment__edit-actions">
              <button
                type="submit"
                className="comment__edit-btn comment__edit-btn--save"
                disabled={!editContent.trim() || editContent.trim() === comment.content}
              >
                Save
              </button>
              <button
                type="button"
                className="comment__edit-btn comment__edit-btn--cancel"
                onClick={handleEditCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="comment__text">
            {comment.content}
          </div>
        )}

        <div className="comment__footer">
          <div className="comment__votes">
            <button
              className={`comment__vote-btn ${comment.userVote === true ? 'comment__vote-btn--active' : ''}`}
              onClick={handleLike}
              disabled={!isAuthenticated}
              title={!isAuthenticated ? 'Login to vote' : 'Like'}
            >
              👍 {comment.voteCounts?.likes || 0}
            </button>

            <button
              className={`comment__vote-btn ${comment.userVote === false ? 'comment__vote-btn--active' : ''}`}
              onClick={handleDislike}
              disabled={!isAuthenticated}
              title={!isAuthenticated ? 'Login to vote' : 'Dislike'}
            >
              👎 {comment.voteCounts?.dislikes || 0}
            </button>
          </div>

          {isAuthenticated && canNest && (
            <button
              className="comment__reply-btn"
              onClick={() => setIsReplying(!isReplying)}
            >
              {isReplying ? 'Cancel' : 'Reply'}
            </button>
          )}

          {comment._count?.replies > 0 && (
            <span className="comment__reply-count">
              {comment._count.replies} {comment._count.replies === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>

        {isReplying && (
          <form className="comment__reply-form" onSubmit={handleReplySubmit}>
            <textarea
              className="comment__reply-input"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
              maxLength={1000}
            />
            <div className="comment__reply-actions">
              <button
                type="button"
                className="comment__reply-cancel"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent('');
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="comment__reply-submit"
                disabled={!replyContent.trim()}
              >
                Reply
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment__replies">
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onLike={onLike}
              onDislike={onDislike}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}

      {/* Show "View more replies" if max depth reached and there are more replies */}
      {depth >= maxDepth && comment._count?.replies > 0 && (
        <button className="comment__view-more">
          View {comment._count.replies} more replies
        </button>
      )}
    </div>
  );
};

export default Comment;