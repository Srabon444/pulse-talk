import useAuthStore from '../store/authStore';
import {Link} from 'react-router-dom';
import Header from '../components/Header';
import '../styles/dashboard.scss';

function Dashboard() {
  const {user} = useAuthStore();

  return (
    <div className="dashboard">
      <Header />
      
      <main className="dashboard-content">
        <div className="welcome-section">
          <h1>Welcome back, {user?.user?.username}!</h1>
          <p>You are logged in successfully!</p>
        </div>

        <div className="dashboard-cards">
          <div className="dashboard-card video-card">
            <div className="card-icon">🎥</div>
            <h3>Tutorial Video</h3>
            <p>Learn how to use Pulse Talk.</p>
            <div className="video-container">
              <iframe
                width="100%"
                height="315"
                src="https://www.youtube.com/embed/hTIrsIy56Pk?si=G1fSeg0EIsl9Wf6k"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen>
              </iframe>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">💬</div>
            <h3>Community Discussion</h3>
            <p>Join the conversation and share your thoughts with the community.</p>
            <Link to="/comments" className="card-link">
              View Comments →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;