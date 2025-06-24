#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is required"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
npm run build

# Run database migrations
echo "Running database migrations..."
npm run db:push

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Start/Restart the application
echo "Starting application with PM2..."
pm2 describe "financial-safety" > /dev/null
if [ $? -eq 0 ]; then
    # Restart if already exists
    pm2 restart "financial-safety"
else
    # Start if doesn't exist
    pm2 start dist/index.js --name "financial-safety"
fi

# Save PM2 process list
pm2 save

echo "Deployment completed successfully!"