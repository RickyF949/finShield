# Financial Safety Platform

A guardian angel platform for seniors' financial safety, helping protect elderly individuals from financial fraud and managing their finances securely.

## Prerequisites

- Node.js (v18 or later recommended)
- PostgreSQL (v14 or later)
- pnpm (recommended) or npm

## Setup Instructions

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd <project-directory>
pnpm install  # or npm install
```

2. Set up the database:
- Create a PostgreSQL database named `financial_safety`
- Update the DATABASE_URL in `.env` if needed (default: "postgresql://postgres:password@localhost:5432/financial_safety")

3. Push the database schema:
```bash
pnpm db:push  # or npm run db:push
```

4. Start the development server:
```bash
pnpm dev  # or npm run dev
```

The application will be available at:
- Frontend + API: http://localhost:5000

## Available Scripts

- `pnpm dev`: Start the development server
- `pnpm build`: Build the application for production
- `pnpm start`: Run the production build
- `pnpm check`: Run TypeScript type checking
- `pnpm db:push`: Push database schema changes

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/financial_safety"
NODE_ENV="development"

# JWT Configuration
JWT_SECRET="your_jwt_secret_here"

# SMTP Configuration with TLS
SMTP_HOST="smtp.example.com"
SMTP_USER="your_smtp_username"
SMTP_PASS="your_smtp_password"

# Application URL
APP_URL="http://localhost:5000"
```

A template file `.env.example` is provided in the repository. Copy it to `.env` and update the values accordingly.

## Project Structure

- `/client`: Frontend React application
- `/server`: Backend Express.js server
- `/shared`: Shared types and database schema
- `/migrations`: Database migration files
