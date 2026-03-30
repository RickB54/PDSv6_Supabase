$file = 'src\pages\PrimeBlog.tsx'
$lines = Get-Content $file

$rocketBtn = @(
    '                                                    {isAdmin && (',
    '                                                        <Button',
    '                                                            variant="ghost"',
    '                                                            size="icon"',
    '                                                            className="h-9 w-9 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"',
    '                                                            onClick={(e) => { e.stopPropagation(); setSocialItem(item); setIsSocialBlastOpen(true); }}',
    '                                                            title="Social Media Blast"',
    '                                                        >',
    '                                                            <Rocket className="w-3.5 h-3.5" />',
    '                                                        </Button>',
    '                                                    )}'
)

$newLines = $lines[0..751] + $rocketBtn + $lines[752..($lines.Length-1)]

$socialDialogs = @(
    '',
    '                {/* Social Blast Engine */}',
    '                <BlogSocialBlast isOpen={isSocialBlastOpen} onOpenChange={setIsSocialBlastOpen} item={socialItem} />',
    '',
    '                {/* AI Content Assistant */}',
    '<BlogAIAssistant isOpen={isAIAssistantOpen} onOpenChange={setIsAIAssistantOpen} onApplySuggestion={(text) => setFormData(prev => ({ ...prev, description: text }))} currentTitle={formData.title} currentDescription={formData.description} />',
    ''
)

$insertIdx = -1
for ($i = 0; $i -lt $newLines.Length; $i++) {
    if ($newLines[$i] -match 'Admin Blog Config Modal') {
        $insertIdx = $i
        break
    }
}

if ($insertIdx -gt 0) {
    $finalLines = $newLines[0..($insertIdx-1)] + $socialDialogs + $newLines[$insertIdx..($newLines.Length-1)]
} else {
    $finalLines = $newLines
}

Set-Content $file $finalLines
Write-Host "Done. Rocket button + Social/AI dialogs injected."
