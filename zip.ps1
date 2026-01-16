# Chrome Web Store用のZIPファイルを作成するスクリプト (Windows PowerShell版)

# バージョン同期: package.json から全ファイルにバージョンを自動同期
$packageJson = Get-Content -Path "./package.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $packageJson.version

$filesToUpdate = @("manifest.json", "README.md", "docs/index.html", "popup/popup.html", "webstore-screenshots/01-popup-ui.html", "webstore-screenshots/03-hero-promo.html")
foreach ($filePath in $filesToUpdate) {
    $content = Get-Content -Path $filePath -Raw -Encoding UTF8
    
    # バージョン番号の置換
    $content = [regex]::Replace($content, 'v[0-9]+\.[0-9]+\.[0-9]+', "v$version")
    $content = [regex]::Replace($content, 'Version [0-9]+\.[0-9]+\.[0-9]+', "Version $version")
    $content = [regex]::Replace($content, '"version": "[^"]+"', "`"version`": `"$version`"")
    $content = [regex]::Replace($content, 'version-[0-9]+\.[0-9]+\.[0-9]+-', "version-$version-")
    
    # ファイルに書き戻す
    $content | Out-File -FilePath $filePath -Encoding UTF8 -NoNewline
}
Write-Host "Version synced: $version" -ForegroundColor Green
Write-Host ""

# アイコン生成
Write-Host "🎨 アイコンを生成中..." -ForegroundColor Cyan
node scripts/generate-icons.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ アイコン生成に失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host ""

# CSS生成
Write-Host "📝 CSSを生成中..." -ForegroundColor Cyan
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
Copy-Item "preload-fonts.js" -Destination $tempDir
Copy-Item "popup" -Destination $tempDir -Recurse
Copy-Item "css" -Destination $tempDir -Recurse
Copy-Item "fonts" -Destination $tempDir -Recurse
Copy-Item "icons" -Destination $tempDir -Recurse

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
