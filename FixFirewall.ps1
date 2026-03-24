# Emma's Chess - Firewall Fix
# Right-click this file -> "Run with PowerShell"
# OR open PowerShell as Admin and run: Set-ExecutionPolicy Bypass -Scope Process; .\FixFirewall.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Emma's Chess - Firewall Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "  Relaunching as Administrator..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "  Running as Administrator" -ForegroundColor Green
Write-Host ""

# Remove any old rules
Write-Host "  Cleaning old rules..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "Emmas Chess*" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Emma's Chess*" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Node.js Chess" -ErrorAction SilentlyContinue

# Add inbound rule for port 3000
Write-Host "  Adding firewall rule for port 3000..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Emmas Chess Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any -Description "Allow Emma's Chess connections" | Out-Null

# Also allow Node.js itself
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($nodePath) {
    Write-Host "  Adding firewall rule for Node.js ($nodePath)..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName "Emmas Chess Node" -Direction Inbound -Protocol TCP -Program $nodePath -Action Allow -Profile Any -Description "Allow Node.js for Emma's Chess" | Out-Null
}

# Verify rules were created
Write-Host ""
Write-Host "  Verifying rules..." -ForegroundColor Yellow
$rules = Get-NetFirewallRule -DisplayName "Emmas Chess*" -ErrorAction SilentlyContinue
if ($rules) {
    foreach ($rule in $rules) {
        Write-Host "  [OK] $($rule.DisplayName) - Enabled: $($rule.Enabled)" -ForegroundColor Green
    }
} else {
    Write-Host "  [FAIL] Rules not found!" -ForegroundColor Red
}

# Show IP addresses
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Your IP Addresses:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } | ForEach-Object {
    Write-Host "    http://$($_.IPAddress):3000" -ForegroundColor White
}

# Test if server is running
Write-Host ""
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "  [OK] Server is running!" -ForegroundColor Green
} catch {
    Write-Host "  [!!] Server is NOT running. Start it with LaunchChess.bat first." -ForegroundColor Red
}

# Check network profile
Write-Host ""
Write-Host "  Network Profile Check:" -ForegroundColor Yellow
Get-NetConnectionProfile | ForEach-Object {
    $cat = $_.NetworkCategory
    Write-Host "    $($_.Name): $cat" -ForegroundColor $(if($cat -eq 'Public'){'Red'}else{'Green'})
    if ($cat -eq 'Public') {
        Write-Host "    ^ This is set to PUBLIC - switching to Private for local sharing..." -ForegroundColor Yellow
        Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private
        Write-Host "    [OK] Switched to Private" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DONE! Now:" -ForegroundColor Green
Write-Host "  1. Make sure LaunchChess.bat is running" -ForegroundColor White
Write-Host "  2. Have Emma open the IP link above" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
