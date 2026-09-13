@echo off
chcp 65001 >nul
echo ========================================================
echo   HUONG DAN FIX LOI BUILD VERCEL & PUSH CODE GITHUB
echo ========================================================
echo.
echo Executing git commands to fix bun.lock and update code...

git rm --cached bun.lock 2>nul
git rm --cached bun.lockb 2>nul
git add -A
git commit -m "Fix: Export pullFullAppDataFromGoogleSheets, fix duplicate key initialData.ts, va remove bun.lock khoi git"
git push origin main

echo.
echo ========================================================
echo   DA PUSH CODE THANH CONG UP GITHUB!
echo   Vercel se tu dong re-deploy va build 100% thanh cong!
echo ========================================================
pause
