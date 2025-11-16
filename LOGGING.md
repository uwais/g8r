# Application Logging Guide

## Log Levels

The application uses Winston for structured logging with the following levels:

- **error**: Critical errors that need immediate attention
- **warn**: Warning messages for potential issues
- **info**: General informational messages (default level)
- **debug**: Detailed debugging information

## Log Locations

### Local Development
- **Console**: All logs displayed in terminal with colors
- **logs/error.log**: Error-level logs only
- **logs/combined.log**: All logs in JSON format

### Production (Render)
- View logs in Render Dashboard → Your Service → Logs tab
- Logs are streamed in real-time
- Can download logs for analysis

## What Gets Logged

### HTTP Requests
Every HTTP request is logged with:
- Method (GET, POST, etc.)
- URL path
- Status code
- Response time
- Content length

Example:
```
2024-01-15 10:30:45 [info]: POST /api/auth/login 200 45 - 123.45 ms
```

### Authentication Events
- User registration attempts
- Login attempts (success/failure)
- Token validation failures
- Unauthorized access attempts

### Business Operations
- Order creation
- Stock updates
- Prescription uploads
- Prescription verification
- Checkout process

### Errors
- Stack traces for all errors
- Request context (path, method, user)
- Error messages and codes

## Log Format

### Console (Development)
```
2024-01-15 10:30:45 [info]: User logged in successfully { userId: 1, email: 'customer@test.com', role: 'customer' }
```

### File (JSON)
```json
{
  "timestamp": "2024-01-15 10:30:45",
  "level": "info",
  "message": "User logged in successfully",
  "userId": 1,
  "email": "customer@test.com",
  "role": "customer",
  "service": "pharmacy-ecommerce"
}
```

## Configuration

Set log level via environment variable:
```bash
LOG_LEVEL=debug npm start
```

Available levels: error, warn, info, debug

## Viewing Logs

### Local Development
```bash
# View all logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log

# View with formatting
cat logs/combined.log | jq
```

### Render Dashboard
1. Go to https://render.com/dashboard
2. Select your service
3. Click "Logs" tab
4. Use search and filters

### Render CLI
```bash
# Install CLI
npm install -g @render/cli

# Login
render login

# View logs
render logs g8r

# Follow in real-time
render logs g8r --tail
```

## Key Log Events to Monitor

### High Priority (Errors)
- Authentication failures
- Checkout failures
- Stock validation errors
- Prescription verification errors

### Medium Priority (Warnings)
- Invalid tokens
- Insufficient stock
- Missing prescriptions
- Unauthorized access attempts

### Low Priority (Info)
- Successful logins
- Order creation
- Stock updates
- Prescription uploads

## Troubleshooting

**No logs appearing?**
- Check LOG_LEVEL environment variable
- Ensure logs/ directory exists
- Check file permissions

**Logs too verbose?**
- Set LOG_LEVEL=warn or LOG_LEVEL=error
- Filter by specific keywords in Render dashboard

**Need more detail?**
- Set LOG_LEVEL=debug
- Check combined.log for full context
