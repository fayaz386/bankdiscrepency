@echo off
title ReconcileFlow Server
echo ===================================================
echo Starting ReconcileFlow Reconciliation Server...
echo ===================================================
cd /d "%~dp0"
cmd /c npm run start
pause
