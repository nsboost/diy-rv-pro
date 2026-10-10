# ESP-IDF requires a project path without spaces. A junction keeps one source tree.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$firmwarePath = Join-Path $projectRoot 'firmware\esp32-s3'

if ($projectRoot -match '\s') {
    $aliasPath = Join-Path (Split-Path -Parent $projectRoot) ((Split-Path -Leaf $projectRoot) -replace '\s', '_')
    if ($aliasPath -match '\s') {
        throw 'The parent directory also contains spaces. Place a junction to this repository in a path without spaces and run this script there.'
    }
    if (Test-Path -LiteralPath $aliasPath) {
        $aliasItem = Get-Item -LiteralPath $aliasPath
        if ($aliasItem.LinkType -ne 'Junction' -or [IO.Path]::GetFullPath([string]$aliasItem.Target).TrimEnd('\') -ne $projectRoot.TrimEnd('\')) {
            throw "Refusing to use an unrelated path: $aliasPath"
        }
    } else {
        New-Item -ItemType Junction -Path $aliasPath -Target $projectRoot | Out-Null
    }
    $firmwarePath = Join-Path $aliasPath 'firmware\esp32-s3'
}

$pioCommand = Get-Command pio -ErrorAction SilentlyContinue
if (-not $pioCommand) {
    throw 'PlatformIO is not on PATH. Open a new PowerShell window after installation.'
}
$pioArguments = @($args)
if ($pioArguments.Count -eq 0) {
    $pioArguments = @('run', '--jobs', '4')
}

Push-Location -LiteralPath $firmwarePath
try {
    & $pioCommand.Source @pioArguments
    $result = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $result
