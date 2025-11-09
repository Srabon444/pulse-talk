import {useEffect} from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import useAuthStore from './store/authStore';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Comments from './pages/Comments';
import './styles/dashboard.scss';

function App() {
  const {initialize, isAuthenticated} = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace/> : <Login/>}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" replace/> : <Register/>}
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard/>
              </PrivateRoute>
            }
          />
          <Route
            path="/comments"
            element={
              <PrivateRoute>
                <Comments/>
              </PrivateRoute>
            }
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace/>}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
