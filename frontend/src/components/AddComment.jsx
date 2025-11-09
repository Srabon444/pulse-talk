import {useState} from 'react';
import {Link} from 'react-router-dom';
import useAuthStore from '../store/authStore';
import {commentsAPI} from '../services/api';

const AddComment = ({onCommentAdded}) => {
  const {user, isAuthenticated} = useAuthStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validateComment = (content) => {
    const errors = {};

    if (!content.trim()) {
      errors.content = 'Comment content is required';
    } else if (content.trim().length < 3) {
      errors.content = 'Comment must be at least 3 characters long';
    } else if (content.trim().length > 1000) {
      errors.content = 'Comment must be less than 1000 characters';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate content
    const validationErrors = validateComment(content);
    if (Object.keys(validationErrors).length > 0) {
      setError(validationErrors.content);
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await commentsAPI.createComment({
        content: content.trim()
      });

      if (response.success) {
        setContent('');
        setError('');

        // Notify parent component that a new comment was added
        if (onCommentAdded) {
          onCommentAdded(response.data);
        }
      } else {
        setError(response.message || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      setError(
        error.response?.data?.message ||
        'An error occurred while posting your comment'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setContent(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  // If user is not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="add-comment add-comment--unauthenticated">
        <div className="add-comment__login-prompt">
          <p>
            <Link to="/login" className="add-comment__login-link">
              Sign in
            </Link>
            {' '}or{' '}
            <Link to="/register" className="add-comment__register-link">
              create an account
            </Link>
            {' '}to join the conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-comment">
      <div className="add-comment__header">
        <div className="add-comment__user-info">
          <span className="add-comment__username">
            Commenting as @{user.username}
          </span>
        </div>
      </div>

      <form className="add-comment__form" onSubmit={handleSubmit}>
        {error && (
          <div className="add-comment__error">
            {error}
          </div>
        )}

        <div className="add-comment__input-group">
          <textarea
            className={`add-comment__textarea ${error ? 'add-comment__textarea--error' : ''}`}
            value={content}
            onChange={handleChange}
            placeholder="What are your thoughts? Share your comment here..."
            rows={4}
            maxLength={1000}
            disabled={isSubmitting}
          />

          <div className="add-comment__meta">
            <span className="add-comment__char-count">
              {content.length}/1000 characters
            </span>
          </div>
        </div>

        <div className="add-comment__actions">
          <button
            type="button"
            className="add-comment__cancel"
            onClick={() => {
              setContent('');
              setError('');
            }}
            disabled={isSubmitting || !content.trim()}
          >
            Clear
          </button>

          <button
            type="submit"
            className="add-comment__submit"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddComment;