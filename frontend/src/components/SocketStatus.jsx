import {useState, useEffect} from 'react';
import socketService from '../services/socket';
import useAuthStore from '../store/authStore';

const SocketStatus = () => {
  const {isAuthenticated} = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsConnected(false);
      setShowStatus(false);
      return;
    }

    // Check initial connection status
    setIsConnected(socketService.isSocketConnected());

    // Set up interval to check connection status
    const checkConnection = setInterval(() => {
      const connected = socketService.isSocketConnected();
      setIsConnected(connected);
    }, 3000);

    // Show status for a few seconds when connection changes
    let statusTimeout;
    const showStatusTemporarily = () => {
      setShowStatus(true);
      clearTimeout(statusTimeout);
      statusTimeout = setTimeout(() => {
        setShowStatus(false);
      }, 3000);
    };

    // Show status on connection changes
    if (isAuthenticated) {
      showStatusTemporarily();
    }

    return () => {
      clearInterval(checkConnection);
      clearTimeout(statusTimeout);
    };
  }, [isAuthenticated]);

  // Auto-hide status after connected for a while
  useEffect(() => {
    if (isConnected && showStatus) {
      const hideTimer = setTimeout(() => {
        setShowStatus(false);
      }, 3000);
      return () => clearTimeout(hideTimer);
    }
  }, [isConnected, showStatus]);

  if (!isAuthenticated || !showStatus) {
    return null;
  }

  return (
    <div className={`socket-status ${isConnected ? 'socket-status--connected' : 'socket-status--disconnected'}`}>
      <div className="socket-status__indicator">
        <div
          className={`socket-status__dot ${isConnected ? 'socket-status__dot--green' : 'socket-status__dot--red'}`}></div>
        <span className="socket-status__text">
          {isConnected ? 'Real-time updates active' : 'Connecting...'}
        </span>
      </div>
    </div>
  );
};

export default SocketStatus;