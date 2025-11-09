import Header from '../components/Header';
import AddComment from '../components/AddComment';
import CommentList from '../components/CommentList';
import SocketStatus from '../components/SocketStatus';
import '../styles/comments.scss';

const Comments = () => {
  const handleCommentAdded = (newComment) => {
    console.log('New comment added:', newComment);
  };

  return (
    <div className="comments-page">
      <Header />
      <SocketStatus />
      <div className="comments-container">
        <header className="comments-header">
          <h1 className="comments-title">Community Discussion</h1>
          <p className="comments-subtitle">
            Share your thoughts and engage with the community
          </p>
        </header>

        <AddComment onCommentAdded={handleCommentAdded}/>
        <CommentList/>
      </div>
    </div>
  );
};

export default Comments;