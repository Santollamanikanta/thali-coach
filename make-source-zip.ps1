# Builds download/thali-coach-source.zip — the open-source drop.
# Web app + the Android WebView shell + build scripts. No keystore, no
# bundletool jar, no build output, no signing material.
$ErrorActionPreference = 'Stop'
$web = "C:\Users\DELL\thali-coach"
$android = "C:\Users\DELL\thali-coach-android"
$stage = Join-Path $env:TEMP ("thali-source-" + [guid]::NewGuid().ToString('N'))
$root = Join-Path $stage "thali-coach"
New-Item -ItemType Directory -Force -Path $root | Out-Null

$webFiles = @(
  'index.html', 'app.js', 'data.js', 'coach-data.js', 'coach.css', 'style.css',
  'sw.js', 'manifest.json', 'privacy.html', 'serve.js', 'README.md', 'LICENSE',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-180.png'
)
foreach ($f in $webFiles) { Copy-Item (Join-Path $web $f) $root -Force }

$ad = Join-Path $root "android"
New-Item -ItemType Directory -Force -Path $ad | Out-Null
Copy-Item (Join-Path $android 'AndroidManifest.xml') $ad -Force
Copy-Item (Join-Path $android 'build.ps1') $ad -Force
Copy-Item (Join-Path $android 'build-aab.ps1') $ad -Force
Copy-Item (Join-Path $android 'res') $ad -Recurse -Force
Copy-Item (Join-Path $android 'src') $ad -Recurse -Force

$zip = Join-Path $web "download\thali-coach-source.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $root -DestinationPath $zip -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force

$item = Get-Item $zip
Write-Host ("SOURCE  {0}  {1:N0} bytes" -f $item.FullName, $item.Length)
