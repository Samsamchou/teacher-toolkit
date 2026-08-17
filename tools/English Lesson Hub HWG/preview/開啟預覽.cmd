@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0開啟預覽.ps1"
if errorlevel 1 (
  echo.
  echo Preview could not be started. Please keep this window open and contact Codex.
  pause
)
endlocal
