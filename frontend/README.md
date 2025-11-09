# Pulse Talk - Frontend

A modern comment system built with React that provides real-time communication features for web applications.

## Features

### Authentication System
- User registration and login
- JWT token-based authentication
- Secure session management
- Automatic logout on token expiration

### Comment Management
- Create, edit, and delete comments
- Nested replies with unlimited depth
- Real-time comment updates across all connected users
- Comment sorting by newest, oldest, or popularity
- Content sanitization for security

### User Interactions
- Like and dislike comments
- Real-time vote counts
- User-specific vote tracking
- Visual feedback for user actions

### Real-time Features
- Live comment updates using WebSocket connections
- Instant notifications for new comments and replies
- Real-time vote synchronization
- Connection status indicator
- Automatic reconnection on network issues

### Pagination
- Server-side pagination for better performance
- Navigate between comment pages
- Configurable items per page
- Smart page controls with previous/next buttons

### User Interface
- Clean, responsive design
- Mobile-friendly layout
- Intuitive comment threading
- Visual distinction between comment levels
- Loading states and error handling

## Technology Stack

- **React 19** - Main framework
- **Vite** - Build tool and development server
- **React Router** - Client-side routing
- **Zustand** - State management
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP requests
- **SASS** - Styling

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the frontend directory:
```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── Comment.jsx     # Individual comment component
│   ├── CommentList.jsx # Main comment container
│   ├── AddComment.jsx  # Comment creation form
│   └── SocketStatus.jsx # Connection status indicator
├── pages/              # Page-level components
│   ├── Login.jsx       # Login page
│   ├── Register.jsx    # Registration page
│   └── Dashboard.jsx   # Main application page
├── services/           # API and external service handlers
│   ├── api.js          # HTTP API calls
│   └── socket.js       # WebSocket connection management
├── store/              # State management
│   └── authStore.js    # Authentication state
├── styles/             # SCSS stylesheets
└── utils/              # Helper functions
```

## Authentication Flow

1. Users register with email, username, and password
2. Login returns a JWT token stored in localStorage
3. Token is included in all API requests and WebSocket connections
4. Automatic token validation and refresh handling
5. Secure logout clears all stored data

## Real-time Communication

The application uses WebSocket connections for real-time features:

- Automatic connection on user authentication
- Reconnection handling with exponential backoff
- Event-based communication for comments, votes, and replies
- Connection status monitoring and user feedback

## API Integration

All backend communication goes through a centralized API service:

- RESTful endpoints for CRUD operations
- Automatic error handling and user feedback
- Request/response interceptors for authentication
- Consistent data formatting across the application
