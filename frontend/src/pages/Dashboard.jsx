import useAuthStore from '../store/authStore';
import {authAPI} from '../services/api';
import {useNavigate, Link} from 'react-router-dom';
import '../styles/dashboard.scss';

function Dashboard() {
  const {user, logout} = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome, {user?.name}!</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      <main className="dashboard-content">
        <p>You are logged in successfully!</p>

        <div className="navigation-links">
          <Link to="/comments" className="nav-link">
            💬 View Comments
          </Link>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;