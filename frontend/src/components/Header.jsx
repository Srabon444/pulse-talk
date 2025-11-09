import useAuthStore from '../store/authStore';
import {authAPI} from '../services/api';
import {useNavigate, Link} from 'react-router-dom';
import '../styles/header.scss';

const Header = () => {
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
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/dashboard" className="logo">
            Pulse Talk
          </Link>
          <nav className="header-nav">
            <Link to="/dashboard" className="nav-item">
              Dashboard
            </Link>
            <Link to="/comments" className="nav-item">
              Comments
            </Link>
          </nav>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <span className="username"> {user?.user?.username}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;