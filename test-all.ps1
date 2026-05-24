Write-Host "--- Running API tests ---" -ForegroundColor Cyan
cd api
npm test
$apiStatus = $LASTEXITCODE
cd ..

Write-Host "`n--- Running Web tests ---" -ForegroundColor Cyan
cd web
npm test -- --run
$webStatus = $LASTEXITCODE
cd ..

if ($apiStatus -eq 0 -and $webStatus -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSome tests failed." -ForegroundColor Red
    exit 1
}
