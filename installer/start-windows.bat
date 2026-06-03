@echo off
chcp 65001 >nul
title ExamTopics Practice
setlocal

set REPO_URL=https://github.com/Max-cfn/Examtopics.git
set APP_DIR=%USERPROFILE%\Documents\Examtopics

echo.
echo   ========================================
echo     ExamTopics Practice - Windows
echo   ========================================
echo.

:: 1. Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [..] Installation de Node.js...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo   [X] Echec. Installez Node.js : https://nodejs.org
        pause
        exit /b 1
    )
    echo   [OK] Node.js installe. Relancez ce script.
    pause
    exit /b 0
)
echo   [OK] Node.js : & node --version

:: 2. Check Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo   [..] Installation de Git...
    winget install Git.Git --accept-package-agreements --accept-source-agreements
    echo   [OK] Git installe. Relancez ce script.
    pause
    exit /b 0
)

:: 3. Clone or update repo
if not exist "%APP_DIR%\.git" (
    echo   [..] Clonage du repo...
    git clone %REPO_URL% "%APP_DIR%"
) else (
    echo   [..] Mise a jour...
    cd /d "%APP_DIR%"
    git pull --ff-only 2>nul || echo   [!] Mise a jour impossible (modifications locales?)
)

cd /d "%APP_DIR%"

:: 4. Install dependencies
if not exist "node_modules" (
    echo   [..] Installation des dependances...
    call npm install --silent
)

:: 5. Create Desktop shortcut if absent
if not exist "%USERPROFILE%\Desktop\ExamTopics Practice.bat" (
    echo   [..] Creation du raccourci Bureau...
    (
        echo @echo off
        echo start "" "%APP_DIR%\installer\start-windows.bat"
    ) > "%USERPROFILE%\Desktop\ExamTopics Practice.bat"
)

:: 6. Kill existing process on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: 7. Start server and open browser
echo   [OK] Demarrage du serveur...
echo.
start "" http://localhost:3000
node server.js
