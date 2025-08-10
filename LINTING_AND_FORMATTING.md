# ESLint and Prettier Configuration

This project has been configured with comprehensive ESLint and Prettier setups for both the client and server codebases.

## Overview

- **Client**: React + TypeScript with Vite
- **Server**: Node.js + Express with ES modules
- **Shared**: Prettier configuration for consistent formatting

## Features

### ESLint Configuration

#### Client (React + TypeScript)
- TypeScript support with `@typescript-eslint`
- React and React Hooks linting
- Import sorting and organization with alphabetical ordering
- Prettier integration
- Comprehensive rules for code quality and consistency

#### Server (Node.js + Express)
- ES modules support
- Node.js specific rules
- Import sorting and organization
- Prettier integration
- Security and best practices rules

### Import Sorting

Both client and server are configured with `eslint-plugin-simple-import-sort` to automatically sort imports in the following order:

1. Side effect imports
2. Node.js builtins
3. External packages (React first for client)
4. Internal packages/modules
5. Parent imports
6. Relative imports
7. Style imports (client only)

### Prettier Configuration

Shared configuration across the entire project:
- Single quotes for JavaScript/TypeScript
- Double quotes for JSX
- Semicolons enabled
- Trailing commas (multiline)
- 2-space indentation
- 100 character line width
- LF line endings

## Available Scripts

### Root Level
```bash
# Run both client and server in development
npm run dev

# Lint entire project
npm run lint

# Fix linting issues across project
npm run lint:fix

# Format entire project
npm run format

# Check formatting without changing files
npm run format:check

# Install dependencies for all packages
npm run install:all

# Build client for production
npm run build

# Type check client TypeScript
npm run type-check
```

### Client
```bash
cd client

# Development server
npm run dev

# Lint client code
npm run lint

# Fix linting issues
npm run lint:fix

# Format client code
npm run format

# Check formatting
npm run format:check

# Type check TypeScript
npm run type-check

# Build for production
npm run build
```

### Server
```bash
cd server

# Development server with nodemon
npm run dev

# Start production server
npm start

# Lint server code
npm run lint

# Fix linting issues
npm run lint:fix

# Format server code
npm run format

# Check formatting
npm run format:check
```

## IDE Integration

### VS Code

Add these settings to your `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.workingDirectories": ["client", "server"],
  "typescript.preferences.organizeImportsCollation": "ordinal"
}
```

Recommended extensions:
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- TypeScript and JavaScript Language Features (built-in)

## Rules Summary

### Key ESLint Rules

#### Both Client & Server
- Import sorting and organization
- No unused variables (with underscore exception)
- Prefer const over let
- No var declarations
- Template literals over string concatenation
- Arrow function spacing
- Consistent quotes and semicolons

#### Client Specific
- React 17+ JSX transform (no React import needed)
- TypeScript strict rules
- React Hooks rules
- Component prop validation with TypeScript
- JSX formatting rules

#### Server Specific
- Node.js globals preference
- ES module import rules
- Security rules (no eval, etc.)
- Error handling best practices
- Express/Node.js patterns

### Prettier Rules
- Single quotes for strings
- Double quotes for JSX attributes
- Semicolons required
- Trailing commas for multiline
- 2 spaces for indentation
- 100 character line width
- Consistent bracket spacing

## Installation

If you need to reinstall dependencies:

```bash
# From project root
npm run install:all

# Or individually
npm install
cd client && npm install
cd ../server && npm install
```

## Customization

To modify linting rules:
- Client: Edit `client/eslint.config.js`
- Server: Edit `server/eslint.config.js`

To modify formatting rules:
- Edit `.prettierrc` in the project root

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure all dependencies are installed
2. **TypeScript errors**: Run `npm run type-check` in client directory
3. **Formatting conflicts**: ESLint and Prettier are configured to work together
4. **Node.js version**: Ensure you're using Node.js 18+ as specified in `engines`

### Debugging

```bash
# Check ESLint configuration
npx eslint --print-config file.js

# Check Prettier configuration
npx prettier --find-config-path file.js

# Verbose linting
npx eslint --debug file.js
```
