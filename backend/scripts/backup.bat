@echo off
REM backup.bat - MySQL Database Backup Script for Windows

REM --- Configuration (EDIT THESE) ---
SET DB_HOST=%DB_HOST%
SET DB_USER=%DB_USER%
SET DB_PASSWORD=%DB_PASSWORD%
SET DB_NAME=%DB_NAME%
SET DB_PORT=%DB_PORT%

REM Directory where backups will be stored (relative to this script's location)
SET BACKUP_DIR=%~dp0..\backups

REM Path to mysqldump.exe (adjust if needed for your MySQL installation)
REM Example paths:
REM C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe
REM C:\xampp\mysql\bin\mysqldump.exe
SET MYSQLDUMP_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" 
REM ^^^ IMPORTANT: Adjust this path to your actual mysqldump.exe location ^^^

REM --- DO NOT EDIT BELOW THIS LINE ---

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Get current timestamp for filename
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
    set _DAY=%%b
    set _MONTH=%%a
    set _YEAR=%%c
)
for /f "tokens=1-3 delims=:. " %%a in ('time /t') do (
    set _HOUR=%%a
    set _MINUTE=%%b
    set _SECOND=%%c
    REM Handle AM/PM suffix if present, remove it for 24h format if needed
    if "%%c"=="PM" if not "%%a"=="12" set /a _HOUR+=12
    if "%%a"=="12" if "%%c"=="AM" set _HOUR=00
)
set FILENAME=%DB_NAME%_%_YEAR%-%_MONTH%-%_DAY%_%_HOUR%-%_MINUTE%-%_SECOND%.sql

REM Full path for the backup file
SET BACKUP_FILE="%BACKUP_DIR%\%FILENAME%"

ECHO Starting backup of database %DB_NAME% to %BACKUP_FILE%...

REM Execute mysqldump command
"%MYSQLDUMP_PATH%" -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p"%DB_PASSWORD%" %DB_NAME% > "%BACKUP_FILE%"

IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: MySQL backup failed! Error code %ERRORLEVEL%.
    EXIT /b 1
) ELSE (
    ECHO MySQL backup completed successfully!
    EXIT /b 0
)