#!/bin/bash
set -e
echo "🔨 Building Konosuba Bot Platform..."
echo ""
echo "📦 Building website..."
cd konosuba-website && npm install && npm run build && cd ..
echo ""
echo "📦 Building bot-manager..."
cd bot-manager && npm install && npm run build && cd ..
echo ""
echo "📦 Installing server dependencies..."
cd api-server && npm install && cd ..
echo ""
echo "✅ Build complete!"
echo ""
echo "Start with: node api-server/server.js"
