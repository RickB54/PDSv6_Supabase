$path = "c:\Users\rberu\PDSv6_Supabase\src\pages\Prospects.tsx"
$content = Get-Content $path
$newContent = @()
for ($i=0; $i -lt $content.Length; $i++) {
    $line = $content[$i]
    $newContent += $line
    # Fix the missing div at line 947 (index 946)
    if ($i -eq 946 -and $line.Trim() -eq "</div>") {
        $newContent += "                      </div>"
    }
    # Fix the extra div at line 1130 (index 1129)
    if ($i -eq 1129 -and $line.Trim() -eq "</div>") {
        # Skip this line to remove it
        $newContent = $newContent[0..($newContent.Length-2)]
    }
}
$newContent | Set-Content $path
