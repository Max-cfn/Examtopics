@echo off
chcp 65001 >nul
title ExamTopics Practice
setlocal enabledelayedexpansion

set REPO_URL=https://github.com/Max-cfn/Examtopics.git

:: Determine app directory (parent of installer/)
set "SCRIPT_DIR=%~dp0"
:: Remove trailing backslash
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
:: Go up one level if we're in installer/
for %%I in ("%SCRIPT_DIR%") do set "PARENT_DIR=%%~dpI"
for %%I in ("%SCRIPT_DIR%") do set "FOLDER_NAME=%%~nxI"
if /i "%FOLDER_NAME%"=="installer" (
    set "APP_DIR=%PARENT_DIR:~0,-1%"
) else (
    set "APP_DIR=%SCRIPT_DIR%"
)

echo.
echo   ========================================
echo     ExamTopics Practice - Windows
echo   ========================================
echo.

:: 1. Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [..] Installation de Node.js...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements >nul 2>&1
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
    winget install Git.Git --accept-package-agreements --accept-source-agreements >nul 2>&1
    if %errorlevel% neq 0 (
        echo   [X] Installez Git : https://git-scm.com
        pause
        exit /b 1
    )
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
    git pull --ff-only 2>nul || echo   [!] Mise a jour impossible
)

cd /d "%APP_DIR%"

:: 4. Install dependencies
if not exist "%APP_DIR%\node_modules" (
    echo   [..] Installation des dependances...
    call npm install --silent
)

:: 5. Start Docker Desktop if installed but not running
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo   [..] Demarrage de Docker Desktop...
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
        if not %errorlevel% equ 0 (
            start "" "%LOCALAPPDATA%\Docker\Docker Desktop.exe" 2>nul
        )
        timeout /t 15 /nobreak >nul
    )
) else (
    echo   [i] Docker non installe (optionnel)
)

:: 6. Create Desktop shortcut if absent
if not exist "%USERPROFILE%\Desktop\ExamTopics Practice.bat" (
    echo   [..] Creation du raccourci Bureau...
    (
        echo @echo off
        echo start "" "%APP_DIR%\installer\start-windows.bat"
    ) > "%USERPROFILE%\Desktop\ExamTopics Practice.bat"
)

:: 7. Kill existing process on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: 8. Start server and open browser
echo   [OK] Demarrage du serveur...
echo.
start "" http://localhost:3000
node "%APP_DIR%\server.js"
