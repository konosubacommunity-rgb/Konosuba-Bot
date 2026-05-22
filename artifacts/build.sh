#!/bin/bash
set -e
echo "Building Konosuba Bot Platform..."

echo "Building konosuba-website..."
cd konosuba-website && npm install && npm run build && cd ..

echo "Building bot-manager..."
cd bot-manager && npm install && npm run build && cd ..

echo "Installing API server dependencies..."
cd api-server && npm install && cd ..

echo "Build complete!"
echo "Start with: node api-server/server.js"
