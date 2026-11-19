param([Parameter(Mandatory=$true)][string]$RequestPath)
$ErrorActionPreference = 'Stop'
$request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
$success = $false
$message = ''
try {
  Wait-Process -Id $request.parentProcess -Timeout 120 -ErrorAction SilentlyContinue
  if (Get-Process -Id $request.parentProcess -ErrorAction SilentlyContinue) {
    throw 'Toolbox is still running. Close it and try installing the update again.'
  }
  $installer = New-Object -ComObject WindowsInstaller.Installer
  $database = $installer.OpenDatabase($request.installer, 0)
  $view = $database.OpenView('SELECT Property, Value FROM Property')
  $view.Execute()
  $properties = @{}
  while ($null -ne ($row = $view.Fetch())) { $properties[$row.StringData(1)] = $row.StringData(2) }
  $view.Close()
  if ($properties['UpgradeCode'] -ne '{732CCA6C-39AD-4A51-BEE0-5F6207D9877D}' -or
      $properties['ProductName'] -ne 'Toolbox' -or
      $properties['ProductVersion'] -ne ($request.version + '.0')) {
    throw 'The downloaded installer does not match Toolbox or the requested version.'
  }
  [Runtime.InteropServices.Marshal]::ReleaseComObject($view) | Out-Null
  [Runtime.InteropServices.Marshal]::ReleaseComObject($database) | Out-Null
  [Runtime.InteropServices.Marshal]::ReleaseComObject($installer) | Out-Null
  $arguments = @('/i', ('"' + $request.installer + '"'), '/passive', '/norestart',
    'MSIINSTALLPERUSER=1',
    ('APPLICATIONROOTDIRECTORY="' + (Split-Path -Parent $request.executable) + '"'),
    '/L*v', ('"' + $request.log + '"'))
  $process = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32/msiexec.exe') -ArgumentList $arguments -WindowStyle Hidden -PassThru -Wait
  if ($process.ExitCode -notin @(0, 1641, 3010)) { throw "Windows Installer returned error $($process.ExitCode)." }
  $success = $true
  $message = 'Toolbox was updated to ' + $request.version + '.'
} catch {
  $message = $_.Exception.Message
} finally {
  @{success=$success; message=$message; log=$request.log} | ConvertTo-Json | Set-Content -LiteralPath $request.result -Encoding UTF8
  if (Test-Path -LiteralPath $request.executable) {
    Start-Process -FilePath $request.executable -WorkingDirectory (Split-Path -Parent $request.executable) -WindowStyle Hidden
  }
}
