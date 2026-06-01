@echo off
chcp 65001 >nul
title ExamTopics Practice
cd /d "%~dp0\.."

echo.
echo   ========================================
echo     ExamTopics Practice - Windows
echo   ========================================
echo.

:: 1. Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Node.js non trouve.
    echo.
    echo   Installation automatique via winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo   [X] Echec de l'installation automatique.
        echo   Installez Node.js manuellement : https://nodejs.org
        echo.
        pause
        exit /b 1
    )
    echo.
    echo   [OK] Node.js installe. Redemarrez ce script.
    pause
    exit /b 0
)

echo   [OK] Node.js trouve : 
node --version

:: 2. Check Docker (optional)
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo   [i] Docker non installe (optionnel, pour telecharger des exams)
    echo       → winget install Docker.DockerDesktop
    echo.
)

:: 3. Install dependencies
if not exist "node_modules" (
    echo   [..] Installation des dependances npm...
    call npm install --silent
    echo   [OK] Dependances installees.
    echo.
)

:: 4. Kill existing process on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: 5. Start server
echo   [..] Demarrage du serveur...
echo.
start /b node server.js

:: 6. Wait for server
timeout /t 2 /nobreak >nul

:: 7. Open browser
echo   [OK] Ouverture du navigateur...
start http://localhost:3000

echo.
echo   ========================================
echo   Serveur actif : http://localhost:3000
echo   Fermez cette fenetre pour arreter.
echo   ========================================
echo.

:: Keep window open (server runs in background via start /b)
node server.js
