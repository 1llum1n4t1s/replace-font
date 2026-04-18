# Chrome Web Store用のZIPファイルを作成するスクリプト (Windows PowerShell版)
# バージョン同期ロジックは scripts/sync-version.js に一元化済み。

$ErrorActionPreference = "Stop"

Write-Host "🔄 バージョン同期中..." -ForegroundColor Cyan
node scripts/sync-version.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ バージョン同期に失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host ""

# CSS生成
Write-Host "🎨 CSSを生成中..." -ForegroundColor Cyan
node scripts/generate-css.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CSS生成に失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "📦 Chrome Web Store用のZIPファイルを作成中..." -ForegroundColor Cyan

# 古いZIPファイルを削除
if (Test-Path "./replace-font-chrome.zip") {
    Remove-Item "./replace-font-chrome.zip" -Force
}

# 一時ディレクトリを作成
$tempDir = "./temp-build"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# 必要なファイルをコピー
Write-Host "📂 必要なファイルをコピー中..." -ForegroundColor Yellow

Copy-Item "manifest.json" -Destination $tempDir
Copy-Item "icons" -Destination $tempDir -Recurse
Copy-Item "src" -Destination $tempDir -Recurse

# 不要なファイルを除外
Get-ChildItem -Path $tempDir -Recurse -Include "*.DS_Store","*.swp","*~" | Remove-Item -Force

# ZIPファイルを作成
Compress-Archive -Path "$tempDir/*" -DestinationPath "./replace-font-chrome.zip" -Force

# 一時ディレクトリを削除
Remove-Item $tempDir -Recurse -Force

if (Test-Path "./replace-font-chrome.zip") {
    Write-Host "✅ ZIPファイルを作成しました: replace-font-chrome.zip" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 ファイルサイズ:" -ForegroundColor Cyan
    $fileSize = (Get-Item "./replace-font-chrome.zip").Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-Host "   $fileSizeMB MB" -ForegroundColor White
    Write-Host ""
    Write-Host "✨ Chrome Web Store Developer Dashboardにアップロードできます！" -ForegroundColor Green
    Write-Host "   https://chrome.google.com/webstore/devconsole" -ForegroundColor Blue
} else {
    Write-Host "❌ ZIPファイルの作成に失敗しました" -ForegroundColor Red
    exit 1
}
