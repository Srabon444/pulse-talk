# Pulse Talk Backend - Comment System API

A real-time comment system built with Node.js, Express, Socket.io, Prisma, and PostgreSQL.

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- Redis (optional, for caching)

### Environment Setup

Create a `.env` file in the backend directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pulse_talk"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Server
PORT=3000
NODE_ENV="development"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### Installation Steps

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Run database migrations:
```bash
npx prisma migrate dev
```

4. Start the development server:
```bash
npm run dev
```

The server will start on http://localhost:3000

## API Documentation

### Authentication Endpoints

#### Register User
- **POST** `/api/auth/register`
- **Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com", 
  "password": "SecurePass123!"
}
```

#### Login User
- **POST** `/api/auth/login`
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Get User Profile
- **GET** `/api/auth/profile`
- **Requires:** Authentication cookie

#### Logout User
- **POST** `/api/auth/logout`
- **Requires:** Authentication cookie

### Comment Endpoints

#### Get All Comments
- **GET** `/api/comments`
- **Query Parameters:**
  - `page` (optional): Page number, default 1
  - `limit` (optional): Items per page, default 10
  - `sortBy` (optional): newest, oldest, likes, dislikes
  - `depth` (optional): Reply depth level, max 5, default 3

#### Create Comment
- **POST** `/api/comments`
- **Requires:** Authentication
- **Body:**
```json
{
  "content": "This is my comment text",
  "parentId": "optional-parent-comment-id-for-replies"
}
```

#### Get Single Comment
- **GET** `/api/comments/:id`
- **Parameters:** Comment ID in URL

#### Update Comment
- **PUT** `/api/comments/:id`
- **Requires:** Authentication + Comment ownership
- **Body:**
```json
{
  "content": "Updated comment text"
}
```

#### Delete Comment
- **DELETE** `/api/comments/:id`
- **Requires:** Authentication + Comment ownership

#### Reply to Comment
- **POST** `/api/comments/:id/reply`
- **Requires:** Authentication
- **Body:**
```json
{
  "content": "This is my reply"
}
```

#### Like Comment
- **POST** `/api/comments/:id/like`
- **Requires:** Authentication

#### Dislike Comment
- **POST** `/api/comments/:id/dislike`
- **Requires:** Authentication

### System Endpoints

#### Health Check
- **GET** `/health`

#### Socket Status
- **GET** `/api/socket/status`

## Real-time Features

The application supports real-time updates using Socket.io:

### WebSocket Connection
Connect to `ws://localhost:3000` with JWT token:

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});
```

### Real-time Events
- `comment_created`: New comment or reply added
- `comment_updated`: Comment content modified
- `comment_deleted`: Comment removed
- `vote_updated`: Like/dislike count changed

### Room Management
- Join comment room: `socket.emit('join_comment', commentId)`
- Leave comment room: `socket.emit('leave_comment', commentId)`

### Authentication Notes

- Login sets an httpOnly cookie named `token`
- Include this cookie in all authenticated requests
- Postman handles cookies automatically after login
- For manual testing, copy token from login response

### Query Parameters Examples

```bash
# Get page 2 with 5 comments per page
GET /api/comments?page=2&limit=5

# Get comments sorted by likes
GET /api/comments?sortBy=likes

# Get comments with maximum 2 reply levels
GET /api/comments?depth=2

# Combined parameters
GET /api/comments?page=1&limit=10&sortBy=newest&depth=3
```

## Security Features

- Input sanitization using DOMPurify
- XSS protection headers
- CSRF protection for state-changing operations
- Rate limiting (100 requests per 15 minutes per IP)
- JWT authentication with secure cookies
- Password hashing with bcrypt

## Database Schema

The system uses three main models:

- **Users**: Authentication and profile data
- **Comments**: Comment content with nested reply support
- **Likes**: User votes (like/dislike) on comments

Comments support unlimited nesting through the `parentId` field, with configurable depth limits for performance.

## Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Generate Prisma client after schema changes
npm run prisma:generate

# Create and apply new database migration
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Start production server
npm start
```

## Troubleshooting

### Common Issues

**Database connection failed:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env file
- Ensure database exists (If not create one, I created my db named: pulse_talk)

**Socket connection rejected:**
- Verify JWT token is valid and not expired
- Check CORS origins in .env file
- Ensure WebSocket transports are allowed

**Rate limit exceeded:**
- Wait 15 minutes for rate limit reset
- Check if multiple requests from same IP

**Authentication failed:**
- Clear browser cookies and login again
- Verify JWT_SECRET matches between sessions
- Check token expiration time

### Logs

Server logs show detailed information about:
- Database connections
- Redis availability
- Socket connections/disconnections
- Authentication attempts
- API request processing
- Error details