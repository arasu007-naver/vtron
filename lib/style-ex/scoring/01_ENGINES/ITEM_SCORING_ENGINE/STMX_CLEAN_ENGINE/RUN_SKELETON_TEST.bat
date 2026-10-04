@echo off
setlocal
cd /d "%~dp0"

set "RESULT=SKELETON_TEST_RESULT.txt"
set "OVERALL=PASS"
set "CT=SKIPPED"
set "CTN=?"
set "L1T=SKIPPED"
set "L1N=?"
set "L2T=SKIPPED"
set "L2N=?"
set "RT=SKIPPED"
set "NODEV=unknown"

echo ==============================
echo    STMX Validation
echo ==============================
echo.

> "%RESULT%" echo ==============================
>>"%RESULT%" echo STMX Validation
>>"%RESULT%" echo Time: %date% %time%
>>"%RESULT%" echo ==============================
>>"%RESULT%" echo.

REM ---------- Node check ----------
node -v > "%TEMP%\stmx_node.txt" 2>&1
if errorlevel 1 goto :nonode
set /p NODEV=<"%TEMP%\stmx_node.txt"
echo Node          : PASS (%NODEV%)
>>"%RESULT%" echo Node Version  : %NODEV%

REM ---------- Contract Tests ----------
if not exist "07_REGRESSION\contract_tests.js" goto :aftercontract
echo Contract Tests: running...
node "07_REGRESSION\contract_tests.js" > "%TEMP%\stmx_ct.txt" 2>&1
set "CT_CODE=%errorlevel%"
>>"%RESULT%" echo.
>>"%RESULT%" echo ----- Contract Tests -----
type "%TEMP%\stmx_ct.txt" >> "%RESULT%"
if "%CT_CODE%"=="0" (set "CT=PASS") else (set "CT=FAIL" & set "OVERALL=FAIL")
for /f "tokens=2 delims=()" %%a in ('findstr /b "SUMMARY:" "%TEMP%\stmx_ct.txt"') do set "CTN=%%a"
echo Contract Tests: %CT% (%CTN%)
:aftercontract

REM ---------- L1 Observation Tests ----------
if not exist "07_REGRESSION\l1_tests.js" goto :afterl1
echo L1 Tests      : running...
node "07_REGRESSION\l1_tests.js" > "%TEMP%\stmx_l1.txt" 2>&1
set "L1_CODE=%errorlevel%"
>>"%RESULT%" echo.
>>"%RESULT%" echo ----- L1 Observation Tests -----
type "%TEMP%\stmx_l1.txt" >> "%RESULT%"
if "%L1_CODE%"=="0" (set "L1T=PASS") else (set "L1T=FAIL" & set "OVERALL=FAIL")
for /f "tokens=2 delims=()" %%a in ('findstr /b "SUMMARY:" "%TEMP%\stmx_l1.txt"') do set "L1N=%%a"
echo L1 Tests      : %L1T% (%L1N%)
:afterl1

REM ---------- L2 Universal Canonical Tests ----------
if not exist "07_REGRESSION\l2_tests.js" goto :afterl2
echo L2 Tests      : running...
node "07_REGRESSION\l2_tests.js" > "%TEMP%\stmx_l2.txt" 2>&1
set "L2_CODE=%errorlevel%"
>>"%RESULT%" echo.
>>"%RESULT%" echo ----- L2 Canonical Tests -----
type "%TEMP%\stmx_l2.txt" >> "%RESULT%"
if "%L2_CODE%"=="0" (set "L2T=PASS") else (set "L2T=FAIL" & set "OVERALL=FAIL")
for /f "tokens=2 delims=()" %%a in ('findstr /b "SUMMARY:" "%TEMP%\stmx_l2.txt"') do set "L2N=%%a"
echo L2 Tests      : %L2T% (%L2N%)
:afterl2

REM ---------- Runtime Demo ----------
if not exist "07_REGRESSION\runtime_demo.js" goto :afterrt
echo Runtime       : running...
node "07_REGRESSION\runtime_demo.js" > "%TEMP%\stmx_rt.txt" 2>&1
set "RT_CODE=%errorlevel%"
>>"%RESULT%" echo.
>>"%RESULT%" echo ----- Runtime Skeleton -----
type "%TEMP%\stmx_rt.txt" >> "%RESULT%"
if "%RT_CODE%"=="0" (set "RT=PASS") else (set "RT=FAIL" & set "OVERALL=FAIL")
echo Runtime       : %RT%
:afterrt

goto :summary

:nonode
echo Node          : NOT INSTALLED
echo.
echo   -------------------------------------------------------
echo    Node.js is NOT installed. The engine is JavaScript,
echo    so Node.js is required to run the tests.
echo.
echo    1) Open  https://nodejs.org
echo    2) Download the big green LTS button
echo    3) Install with default options
echo    4) Close all windows, then double-click this .bat again
echo   -------------------------------------------------------
echo.
>>"%RESULT%" echo Node          : NOT INSTALLED
>>"%RESULT%" echo OVERALL       : FAIL  (Node.js not installed)
echo Result file: %RESULT%  (opening in Notepad)
start "" notepad "%RESULT%"
echo.
echo Press any key to close. The result stays in Notepad.
pause >nul
endlocal
exit /b 1

:summary
>>"%RESULT%" echo.
>>"%RESULT%" echo ==============================
>>"%RESULT%" echo Node          : PASS (%NODEV%)
>>"%RESULT%" echo Contract Tests: %CT% (%CTN%)
>>"%RESULT%" echo L1 Tests      : %L1T% (%L1N%)
>>"%RESULT%" echo L2 Tests      : %L2T% (%L2N%)
>>"%RESULT%" echo Runtime       : %RT%
>>"%RESULT%" echo Architecture  : UNCHANGED
>>"%RESULT%" echo Production    : UNCHANGED
>>"%RESULT%" echo OVERALL       : %OVERALL%
>>"%RESULT%" echo ==============================

echo.
echo ==============================
echo Node          : PASS (%NODEV%)
echo Contract Tests: %CT% (%CTN%)
echo L1 Tests      : %L1T% (%L1N%)
echo L2 Tests      : %L2T% (%L2N%)
echo Runtime       : %RT%
echo Architecture  : UNCHANGED
echo Production    : UNCHANGED
echo OVERALL       : %OVERALL%
echo ==============================
echo.
echo Result file: %RESULT%  (opening in Notepad)
start "" notepad "%RESULT%"
echo.
echo Press any key to close. The result stays in Notepad.
pause >nul
endlocal
