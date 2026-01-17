@echo off
REM ATTENDING AI - Maintenance Script Wrapper
REM Usage: maintain.bat [command]
REM Commands: clean, lint, build, test, full, help

powershell -ExecutionPolicy Bypass -File "%~dp0maintain.ps1" %*
