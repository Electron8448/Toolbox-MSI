param()
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$toolsRoot = Join-Path $projectRoot '.build-tools'
$wixRoot = Join-Path $toolsRoot 'wix-3.14.1'
$archive = Join-Path $toolsRoot 'wix314-binaries.zip'
$expected = '6AC824E1642D6F7277D0ED7EA09411A508F6116BA6FAE0AA5F2C7DAA2FF43D31'
if ((Test-Path -LiteralPath (Join-Path $wixRoot 'candle.exe')) -and
    (Test-Path -LiteralPath (Join-Path $wixRoot 'light.exe'))) {
  Write-Output "WiX 3.14.1 is ready in $wixRoot"
  exit 0
}
New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
if (!(Test-Path -LiteralPath $archive)) {
  Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip' -OutFile $archive
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expected) {
  throw 'WiX archive checksum mismatch. Remove the archive and retry.'
}
New-Item -ItemType Directory -Path $wixRoot -Force | Out-Null
Expand-Archive -LiteralPath $archive -DestinationPath $wixRoot -Force
if (!(Test-Path -LiteralPath (Join-Path $wixRoot 'light.exe'))) { throw 'WiX extraction did not complete.' }
Write-Output "WiX 3.14.1 is ready in $wixRoot"
