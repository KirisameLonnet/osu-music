#!/bin/bash

echo "🔨 Building Quasar project for SPA..."
quasar build -m spa

if [ $? -eq 0 ]; then
    echo "📱 Syncing to iOS..."
    npx cap sync ios
    
    if [ $? -eq 0 ]; then
        echo "✅ iOS sync complete!"
        echo "💡 You can now run: npx cap open ios"
    else
        echo "❌ iOS sync failed"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi
