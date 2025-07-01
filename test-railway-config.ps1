# Test script to check Railway deployment configuration
Write-Host "🧪 Testing Railway Deployment Configuration" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$RAILWAY_URL = "https://web-production-87ed5.up.railway.app"

Write-Host ""
Write-Host "📊 Checking upload configuration..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer YOUR_TOKEN_HERE"
        "Content-Type" = "application/json"
    }
    
    $configResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/api/files/upload-config" -Headers $headers -Method Get
    Write-Host "Configuration Response:" -ForegroundColor Green
    $configResponse | ConvertTo-Json -Depth 3
    
    $maxFileSizeMB = $configResponse.maxFileSizeMB
    if ($maxFileSizeMB -eq 1024) {
        Write-Host "✅ File size limit is correctly set to 1GB" -ForegroundColor Green
    } else {
        Write-Host "❌ File size limit is $maxFileSizeMB MB, should be 1024 MB" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to get config. Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Make sure to replace 'YOUR_TOKEN_HERE' with a valid JWT token" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Checking health endpoint..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/api/health" -Method Get
    Write-Host "Health Response:" -ForegroundColor Green
    $healthResponse | ConvertTo-Json -Depth 2
} catch {
    Write-Host "❌ Health endpoint failed. Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 Instructions:" -ForegroundColor Cyan
Write-Host "1. Replace 'YOUR_TOKEN_HERE' with a valid JWT token from your browser"
Write-Host "2. Run this script to check current Railway configuration"
Write-Host "3. Compare the maxFileSize value with expected 1073741824 (1GB)"
Write-Host ""
Write-Host "🔧 If maxFileSize is not 1GB:" -ForegroundColor Yellow
Write-Host "1. Go to Railway Dashboard > Your Project > Variables"
Write-Host "2. Add/Update: MAX_FILE_SIZE = 1073741824"
Write-Host "3. Redeploy the Railway service"
Write-Host "4. Run this test again to verify"
Write-Host ""
Write-Host "🚀 Quick Railway CLI commands:" -ForegroundColor Cyan
Write-Host "   railway login"
Write-Host "   railway link"
Write-Host "   railway variables set MAX_FILE_SIZE=1073741824"
Write-Host "   railway up"
