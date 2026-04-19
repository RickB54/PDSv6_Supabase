$f = 'c:\Users\rberu\PDSv6_Supabase\src\pages\SearchCustomer.tsx'
$lines = Get-Content $f -Encoding UTF8

$totalLines = $lines.Count
Write-Host "Total lines: $totalLines"

# 0-indexed:
# 859 = `                      </div>` closing 2-col layout
# 860 = blank line
# 861-889 = gallery IIFE block (lines 862-890 in 1-based)
# 890-892 = `                 </div>\n              );\n            })}`

$galleryLines = $lines[861..889]
$before = $lines[0..858]
$closingDiv = $lines[859]
$restStart = 890
$afterGallery = $lines[$restStart..($totalLines - 1)]

$newContent = $before + $galleryLines + @($closingDiv, "") + $afterGallery

Set-Content $f -Value $newContent -Encoding UTF8
Write-Host "Done - gallery repositioned"
