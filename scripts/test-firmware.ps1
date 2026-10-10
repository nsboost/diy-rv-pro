$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$firmware = Join-Path $repo 'firmware\esp32-s3'
$pioHome = if ($env:PLATFORMIO_CORE_DIR) { $env:PLATFORMIO_CORE_DIR } else { Join-Path $env:USERPROFILE '.platformio' }
$unity = Join-Path $pioHome 'packages\framework-espidf\components\unity\unity\src'
$cjson = Join-Path $firmware 'managed_components\espressif__cjson\cJSON'
foreach ($dependency in @((Join-Path $unity 'unity.c'), (Join-Path $cjson 'cJSON.c'))) {
    if (-not (Test-Path -LiteralPath $dependency)) {
        throw "Missing dependency $dependency. Build firmware with scripts/pio.ps1 first."
    }
}
if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path -LiteralPath $vswhere)) { throw 'Install Visual Studio Build Tools with C++ tools.' }
    $installation = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if (-not $installation) { throw 'Visual Studio C++ tools were not found.' }
    & (Join-Path $installation 'Common7\Tools\Launch-VsDevShell.ps1') -Arch amd64 -HostArch amd64 -SkipAutomaticLocation | Out-Null
}
$build = Join-Path $firmware '.pio\host-tests'
New-Item -ItemType Directory -Path $build -Force | Out-Null
$sources = @(
    (Join-Path $firmware 'test\test_mock_telemetry.c'),
    (Join-Path $firmware 'src\feature_config.c'),
    (Join-Path $firmware 'src\sensor_validation.c'),
    (Join-Path $firmware 'src\automation_engine.c'),
    (Join-Path $firmware 'src\automation_sources.c'),
    (Join-Path $firmware 'src\automation_recovery_store.c'),
    (Join-Path $firmware 'test\test_automation_recovery_store.c'),
    (Join-Path $firmware 'src\timezone_lookup.c'),
    (Join-Path $firmware 'src\contact_filter.c'),
    (Join-Path $firmware 'src\mock_telemetry.c'),
    (Join-Path $cjson 'cJSON.c'),
    (Join-Path $unity 'unity.c')
)
Push-Location -LiteralPath $build
try {
    & cl.exe /nologo /std:c11 /W3 /D_CRT_SECURE_NO_WARNINGS /DDIY_HOST_TEST "/I$firmware\test\host" "/I$firmware\src" "/I$cjson" "/I$unity" @sources /Fe:firmware-tests.exe
    if ($LASTEXITCODE -ne 0) { throw 'Firmware host tests failed to compile.' }
    & (Join-Path $build 'firmware-tests.exe')
    if ($LASTEXITCODE -ne 0) { throw 'Firmware host tests failed.' }
} finally {
    Pop-Location
}
