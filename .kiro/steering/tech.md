# Technology Stack

## Backend

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js 4.x
- **Module System**: ES Modules (`"type": "module"` in package.json)
- **Authentication**: JWT tokens with bcryptjs for password hashing
- **File Upload**: Multer for handling multipart/form-data
- **CSV Parsing**: csv-parse for bulk uploads
- **Logging**: Winston for structured logging, Morgan for HTTP request logging
- **Session Management**: express-session with cookie-parser

## Frontend

- **Vanilla JavaScript** (no framework)
- **HTML5** with semantic markup
- **CSS3** for styling
- **Fetch API** for HTTP requests with JWT bearer tokens

## Data Storage

- **In-memory arrays** for all data (users, catalog, orders, prescriptions, reviews)
- No database - data resets on server restart
- File system storage for uploaded prescription documents in `uploads/` directory

## Common Commands

```bash
# Install dependencies
npm install

# Start server (development and production)
npm start
# or
npm run dev

# Server runs on port 3000 by default
# Override with PORT environment variable
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT signing (default: 'your-secret-key-change-in-production')
- `LOG_LEVEL` - Winston log level (default: 'info')
- `NODE_ENV` - Environment mode (development/production)

## Deployment

- Configured for Render.com via `render.yaml`
- Logs written to `logs/error.log` and `logs/combined.log`
- Static files served from `public/` directory
- Listens on 0.0.0.0 for container compatibility

## Code Conventions

- Use async/await for asynchronous operations
- ES6+ syntax (arrow functions, destructuring, template literals)
- Structured logging with Winston (include userId, context metadata)
- Auth middleware pattern for protected routes
- RESTful API design with `/api/` prefix
- Error responses with appropriate HTTP status codes
