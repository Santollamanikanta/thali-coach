# Replaces every asset on the v1.2 release with the freshly built files.
$ErrorActionPreference = 'Stop'
$repo = "Santollamanikanta/thali-coach"
$tag  = "v1.2"
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
$tok  = ($cred | Where-Object { $_ -match '^password=' }) -replace '^password=',''
$h = @{ Authorization = "token $tok"; "User-Agent" = "thali-coach"; Accept = "application/vnd.github+json" }

$rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$tag" -Headers $h
$assets = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/$($rel.id)/assets" -Headers $h
foreach ($a in $assets) {
  Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/assets/$($a.id)" -Headers $h -Method Delete | Out-Null
  Write-Host "removed $($a.name)"
}
Start-Sleep -Seconds 4

$base = ($rel.upload_url -replace '\{\?name,label\}','')
$files = @(
  @{ path = "C:\Users\DELL\thali-coach\download\thali-coach.apk";        type = "application/vnd.android.package-archive" },
  @{ path = "C:\Users\DELL\thali-coach\download\thali-coach.aab";        type = "application/octet-stream" },
  @{ path = "C:\Users\DELL\thali-coach\download\thali-coach-source.zip"; type = "application/zip" }
)
foreach ($f in $files) {
  $name = Split-Path $f.path -Leaf
  $bytes = [System.IO.File]::ReadAllBytes($f.path)
  for ($i = 1; $i -le 4; $i++) {
    try {
      $uh = $h.Clone(); $uh["Content-Type"] = $f.type
      $a = Invoke-RestMethod -Uri "$($base)?name=$name" -Headers $uh -Method Post -Body $bytes
      Write-Host ("uploaded {0}  {1:N0} bytes" -f $name, $a.size)
      break
    } catch {
      if ($i -eq 4) { throw }
      Write-Host "retry $i for $name"
      Start-Sleep -Seconds (3 * $i)
    }
  }
}

$assets = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/$($rel.id)/assets" -Headers $h
foreach ($a in $assets) { Write-Host ("asset {0}  {1:N0}  {2}" -f $a.name, $a.size, $a.digest) }
Write-Host "RELEASE $($rel.html_url)"
