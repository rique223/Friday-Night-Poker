# Friday Night Poker 🃏

A comprehensive poker session management application designed for tracking buy-ins, credits, payouts, and session history for casual poker games. Built with a modern React frontend and Express.js backend.

## 🌟 Features

### Session Management

- **Create and manage poker sessions** with creator tracking
- **Real-time session monitoring** with active/inactive status
- **Session archiving** for historical record keeping
- **Comprehensive search and filtering** with pagination

### Player Tracking

- **Add players dynamically** to ongoing sessions
- **Track individual buy-ins** with timestamped history
- **Credit system** for player-to-player transactions
- **Automated net balance calculations**
- **Cash-out management** with final chip counts and payouts

### User Experience

- **Multi-language support** (Portuguese, English, Spanish)
- **Multi-currency support** (BRL, USD, EUR)
- **Dark/Light theme toggle**
- **Responsive design** for desktop and mobile
- **Real-time data updates** with optimistic UI
- **Comprehensive error handling** with user-friendly messages

### Technical Features

- **JWT-based authentication** with secure session management
- **SQLite database** with automatic schema migration
- **RESTful API** with comprehensive error handling
- **Type-safe development** with TypeScript
- **Modern development tools** with hot reloading

## 🛠️ Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **Axios** for API communication
- **React Hot Toast** for notifications
- **Lucide React** for icons

### Backend

- **Node.js** with Express.js
- **SQLite** with sqlite3 driver
- **JWT** for authentication
- **bcrypt** for password hashing
- **CORS** and rate limiting for security
- **ESM modules** throughout

### Development Tools

- **ESLint** with TypeScript support
- **Prettier** for code formatting
- **Concurrently** for running multiple processes
- **Nodemon** for backend hot reloading

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/friday-night-poker.git
cd friday-night-poker
```

### 2. Install Dependencies

```bash
# Install all dependencies (root, client, and server)
npm run install:all
```

### 3. Environment Setup

Create a `.env` file in the `server` directory:

```env
PORT=4000
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
```

### 4. Start the Application

```bash
# Development mode (starts both client and server)
npm run dev
```

The application will be available at:

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4000

### 5. Create Initial User (Optional)

```bash
# Navigate to server directory and create a user
cd server
node scripts/createUser.js
```

## 📁 Project Structure

    friday-night-poker/
    ├── client/                 # React frontend application
    │   ├── src/
    │   │   ├── components/     # Reusable UI components
    │   │   ├── contexts/       # React contexts (Auth, Preferences)
    │   │   ├── hooks/          # Custom React hooks
    │   │   ├── pages/          # Route components
    │   │   ├── services/       # API service layer
    │   │   ├── types/          # TypeScript type definitions
    │   │   └── utils/          # Utility functions
    │   ├── public/             # Static assets
    │   └── package.json
    ├── server/                 # Express.js backend application
    │   ├── controllers/        # Request handlers
    │   ├── lib/                # Database configuration
    │   ├── middleware/         # Express middleware
    │   ├── routes/             # API routes
    │   ├── scripts/            # Utility scripts
    │   ├── services/           # Business logic layer
    │   └── package.json
    └── package.json           # Root package.json

## 🔧 Available Scripts

### Root Level

```bash
npm run dev              # Start both client and server in development mode
npm run build            # Build the client for production
npm run lint             # Lint both client and server
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # Run TypeScript type checking
npm run install:all      # Install dependencies for all workspaces
```

### Client Only

```bash
cd client
npm run dev              # Start Vite development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint frontend code
npm run type-check       # TypeScript type checking
```

### Server Only

```bash
cd server
npm run dev              # Start server with nodemon
npm start                # Start server in production mode
npm run lint             # Lint backend code
```

## 🗄️ Database Schema

The application uses SQLite with the following main tables:

### Sessions

- `id` - Primary key
- `is_active` - Session status (boolean)
- `created_at` - Creation timestamp
- `created_by` - Creator name (optional)
- `deleted_at` - Soft deletion timestamp

### Players

- `id` - Primary key
- `session_id` - Foreign key to sessions
- `name` - Player name
- `net_balance` - Calculated balance (buy-ins - credits)
- `buy_ins_log` - JSON array of buy-in history
- `credits_log` - JSON array of credit history
- `is_active` - Player status
- `final_chip_count` - Chips at cash-out
- `payout` - Final payout amount

### Users

- `id` - Primary key
- `email` - User email (unique)
- `password_hash` - Hashed password
- `role` - User role (default: 'user')
- `created_at` - Creation timestamp

## 🔐 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Sessions

- `GET /api/sessions` - List sessions with pagination
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `PUT /api/sessions/:id/end` - End session
- `DELETE /api/sessions/:id` - Archive session
- `GET /api/sessions/archived` - List archived sessions

### Players

- `GET /api/sessions/:id/players` - List session players
- `POST /api/sessions/:id/players` - Add player to session
- `POST /api/sessions/:id/buyins` - Register buy-in
- `POST /api/sessions/:id/credits` - Register credit transfer
- `POST /api/sessions/:id/cashout` - Cash out player

## 🌍 Internationalization

The application supports multiple languages:

- **Portuguese (pt)** - Default
- **English (en)**
- **Spanish (es)**

Currency support:

- **Brazilian Real (BRL)**
- **US Dollar (USD)**
- **Euro (EUR)**

## 🎨 Theming

The application includes:

- **Light theme** (default)
- **Dark theme**
- **System preference detection**
- **Persistent theme selection**

## 🔒 Security Features

- **JWT-based authentication** with secure HTTP-only cookies
- **Password hashing** using bcrypt
- **Rate limiting** on API endpoints
- **CORS protection** with configurable origins
- **Input validation** and sanitization
- **SQL injection protection** using parameterized queries

## 🚀 Deployment

### Environment Variables

Set the following environment variables for production:

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=your-super-secret-production-jwt-key
```

### Build for Production

```bash
# Build the client
npm run build

# The built files will be in client/dist/
# Serve them with your preferred static file server
```

### Database

The SQLite database file is automatically created in `server/data/poker.sqlite`. Ensure this directory is writable and backed up regularly.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow ESLint and Prettier configurations
- Use TypeScript for type safety
- Write meaningful commit messages
- Add tests for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the need for better poker session management
- Community feedback and contributions welcome

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/friday-night-poker/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Happy Poker Night! 🎰**
