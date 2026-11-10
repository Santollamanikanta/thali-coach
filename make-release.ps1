# Publishes the APK, AAB and source ZIP as a GitHub Release, so everything
# can be downloaded from github.com alone (no other host needed).
$ErrorActionPreference = 'Stop'
$repo = "Santollamanikanta/thali-coach"
$tag  = "v1.2"

$cred = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
$tok  = ($cred | Where-Object { $_ -match '^password=' }) -replace '^password=',''
if (-not $tok) { throw "No GitHub token in the credential manager." }

$h = @{
  Authorization = "token $tok"
  "User-Agent"  = "thali-coach"
  Accept        = "application/vnd.github+json"
}

$body = @{
  tag_name         = $tag
  target_commitish = "main"
  name             = "Thali Coach 1.2"
  draft            = $false
  prerelease       = $false
  body             = @"
Thali Coach 1.2 — offline Indian diet & activity app.

Downloads
• thali-coach.apk — install on Android (sideload). Allow "install unknown apps" when asked.
• thali-coach.aab — upload bundle for Google Play Console.
• thali-coach-source.zip — full source (web app + Android shell), MIT licence.

What's new in 1.2
• Camera on the Coach tab: snap the plate, it is saved with the entry.
• Full month calendar on Plan, with dots on logged days.
• Saving a weigh-in rebuilds targets and plan; Targets adds refresh / reset today / start over.
• MIT licensed, full source published.

Notes
• Estimates only, not medical advice. Healthy-habits mode hides calorie numbers.
• Uninstall any older sideload copy before installing a Play-signed build (different keys).
• The web app is also live on GitHub Pages: https://santollamanikanta.github.io/thali-coach/
"@
} | ConvertTo-Json

$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

try {
  $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases" -Headers $h -Method Post -Body $bodyBytes -ContentType "application/json; charset=utf-8"
  Write-Host "created release $($rel.id) $($rel.html_url)"
} catch {
  $msg = $_.ErrorDetails.Message
  if ($msg -match 'already_exists') {
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$tag" -Headers $h -Method Get
    Write-Host "release already exists: $($rel.html_url)"
  } else { throw }
}

$uploadBase = ($rel.upload_url -replace '\{\?name,label\}','')
Write-Host "upload base: $uploadBase"

$files = @(
  @{ path = "C:\Users\DELL\thali-coach\download\thali-coach.apk";         type = "application/vnd.android.package-archive" },
  @{ path = "C:\Users\DELL\thali-coach\download\thali-coach.aab";         type = "application/octet-stream" },
  @{ path = "C:\Users\DELL\thali-coach\download\thali-coach-source.zip";  type = "application/zip" }
)

foreach ($f in $files) {
  $name = Split-Path $f.path -Leaf
  $existing = $null
  try {
    $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/$($rel.id)/assets" -Headers $h -Method Get |
      Where-Object { $_.name -eq $name }
  } catch { }
  if ($existing) {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/assets/$($existing.id)" -Headers $h -Method Delete | Out-Null
    Write-Host "replaced old asset $name"
  }
  $bytes = [System.IO.File]::ReadAllBytes($f.path)
  $uh = $h.Clone()
  $uh["Content-Type"] = $f.type
  $a = Invoke-RestMethod -Uri "$($uploadBase)?name=$name" -Headers $uh -Method Post -Body $bytes
  Write-Host ("uploaded {0}  {1:N0} bytes  {2}" -f $name, $a.size, $a.browser_download_url)
}

Write-Host "RELEASE  $($rel.html_url)"
