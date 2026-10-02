# WARNING: This deletes db.sqlite and rebuilds the schema from the entity
# metadata. Every row is lost. Run `bun run dev` afterwards to scrape the site
# again.
function ScriptContent
{
    bun run scripts/sync-db.ts
}

Write-Host "WARNING: This will delete the database file and resync the schema!" -ForegroundColor Yellow
$confirmation = Read-Host "Are you sure you want to continue? (Y/N)"

if ($confirmation -eq 'Y' -or $confirmation -eq 'y')
{
    Write-Host "Deleting database file..." -ForegroundColor Red
    ScriptContent
    if ($LASTEXITCODE -ne 0)
    {
        Write-Host "Schema sync failed. See the output above." -ForegroundColor Red
        exit 1
    }
    Write-Host "Database resync completed." -ForegroundColor Green
}
else
{
    Write-Host "Operation cancelled." -ForegroundColor Blue
}
pause