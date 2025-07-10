#!/bin/bash
set -e
echo "Executing custom startup script..."
echo "Running build..."
npm run build
echo "Starting server..."
npm start
