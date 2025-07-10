#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Run the build command
echo "Running custom build step..."
npm run build

# Run the start command
echo "Starting application..."
npm start
