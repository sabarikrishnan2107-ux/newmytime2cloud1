@echo off
REM ===========================================================================
REM  Allow other PCs and physical devices on the LAN to reach MyTime2Cloud.
REM  RIGHT-CLICK this file -> "Run as administrator" (one-time).
REM
REM  Opens inbound firewall ports for private/domain networks:
REM    App for LAN browsers
REM      8000  API (nginx)            3001  web UI (nginx)
REM      8077  SSE push relay         8080  .NET SDK REST + live WebSocket
REM      8888  Java SX face SDK
REM    Physical access/attendance devices -> .NET SDK (FCardProtocolAPI)
REM      7002/TCP  device inbound (TCPServerPort)
REM      7001/UDP  device discovery (UDPServerPort)   8101/UDP  device (UDPPort)
REM  (The SDK's TCPPort 8000 is the DEVICE-side port the SDK dials OUT to, not a
REM   local listener, so it needs no inbound rule.)
REM ===========================================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo This script must be run as Administrator.
  echo Right-click allow-lan-access.bat and choose "Run as administrator".
  pause
  exit /b 1
)

for %%P in (8000 3001 8077 8080 8888 8500 3002 4000 8083 1883 7002) do (
  netsh advfirewall firewall delete rule name="MyTime2Cloud TCP %%P" >nul 2>&1
  netsh advfirewall firewall add rule name="MyTime2Cloud TCP %%P" dir=in action=allow protocol=TCP localport=%%P profile=private,domain >nul
)

for %%P in (7001 8101) do (
  netsh advfirewall firewall delete rule name="MyTime2Cloud UDP %%P" >nul 2>&1
  netsh advfirewall firewall add rule name="MyTime2Cloud UDP %%P" dir=in action=allow protocol=UDP localport=%%P profile=private,domain >nul
)

echo.
echo Firewall rules added (private/domain networks):
echo   TCP  8000 3001 8077 8080 8888 8500 3002 4000 8083 1883 7002
echo   UDP  7001 8101
echo Other PCs can reach the app; physical devices can connect to the SDK.
pause
