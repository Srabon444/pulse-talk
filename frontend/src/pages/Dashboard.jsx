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