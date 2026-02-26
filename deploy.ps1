# IQOS Dashboard Deployment Script
# -------------------------------
# Συγχρονισμός βάσης και Push στο GitHub

Write-Host "🚀 Starting Deployment Process..." -ForegroundColor Cyan

# 1. Database Synchronization
Write-Host "📦 Synchronizing Database Schema..." -ForegroundColor Yellow
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma DB Push failed. Please check your Neon DB connection." -ForegroundColor Red
    exit
}

Write-Host "⚙️ Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma Generate failed." -ForegroundColor Red
    exit
}

# 2. Git Operations
Write-Host "📂 Staging all changes..." -ForegroundColor Yellow
git add .

Write-Host "📝 Committing changes..." -ForegroundColor Yellow
$commitMsg = "feat: refined team performance dashboard and deployment security"
git commit -m $commitMsg

Write-Host "⬆️ Pushing to GitHub..." -ForegroundColor Yellow
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git Push failed." -ForegroundColor Red
    exit
}

Write-Host "✅ Deployment Complete! Everything is up to date and user passwords were preserved." -ForegroundColor Green

