 = Get-ChildItem -Path "c:\Users\XIAOMI\Desktop\Appzeto\TailCircle\Frontend\src" -Recurse -Filter "*.jsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $updated = $content -replace "#F05A2A", "#5A5552"
    $updated = $updated -replace "#00C896", "#5A5552"
    $updated = $updated -replace "#FF8A65", "#5A5552"
    $updated = $updated -replace "#4DB6AC", "#5A5552"
    $updated = $updated -replace "#E64A19", "#3A3634"
    if ($content -ne $updated) {
        Set-Content -Path $file.FullName -Value $updated
    }
}
Write-Host "Replaced hex colors in JSX files."
