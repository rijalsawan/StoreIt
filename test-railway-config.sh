#!/bin/bash

# Test script to check Railway deployment configuration
echo "🧪 Testing Railway Deployment Configuration"
echo "============================================="

RAILWAY_URL="https://web-production-87ed5.up.railway.app"

echo ""
echo "📊 Checking upload configuration..."
curl -s "${RAILWAY_URL}/api/files/upload-config" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  | python -m json.tool 2>/dev/null || echo "❌ Failed to get config (check your auth token)"

echo ""
echo "🔍 Checking health endpoint..."
curl -s "${RAILWAY_URL}/api/health" | python -m json.tool 2>/dev/null || echo "❌ Health endpoint failed"

echo ""
echo "💡 Instructions:"
echo "1. Replace 'YOUR_TOKEN_HERE' with a valid JWT token"
echo "2. Run this script to check current Railway configuration"
echo "3. Compare the maxFileSize value with expected 1073741824 (1GB)"
echo ""
echo "🔧 If maxFileSize is not 1GB:"
echo "1. Update Railway environment variable: MAX_FILE_SIZE=1073741824"
echo "2. Redeploy the Railway service"
echo "3. Run this test again to verify"
