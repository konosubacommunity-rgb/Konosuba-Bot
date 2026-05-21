#!/bin/bash
set -e
echo "🔨 Building Konosuba Bot Platform..."
echo ""
echo "📦 Building website..."
cd website && npm install && npm run build && cd ..
echo ""
echo "📦 Building bot-manager..."
cd bot-manager && npm install && npm run build && cd ..
echo ""
echo "📦 Installing server dependencies..."
cd server && npm install && cd ..
echo ""
echo "✅ Build complete!"
echo ""
echo "Start with: node server/server.js"
