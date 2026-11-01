# Auditoria LOCAL y de solo lectura del proyecto Apps Script STAGING.
# Requisitos: PowerShell, Node.js, clasp instalado y autenticado.
# No se ejecutan push, deploy, version, start, resume ni llamadas a Gemini.
# ScriptId y archivos de Apps Script permanecen SOLO en una carpeta temporal.
#
# Ejemplo (desde la raiz del repo):
# .\tools\verificar-staging-solo-lectura.ps1 -ScriptId '<ID_STAGING>'
# .\tools\verificar-staging-solo-lectura.ps1 -ScriptId '<ID_STAGING>' -VersionNumber 2

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$ScriptId,

  [ValidateRange(0, 2147483647)]
  [int]$VersionNumber = 0,

  [switch]$KeepTemp
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$auditor = Join-Path $repoRoot 'tools\auditar-deploy-local.cjs'
$reference = Join-Path $repoRoot 'gas\Orquestador.js'

if (!(Test-Path -LiteralPath $auditor) -or !(Test-Path -LiteralPath $reference)) {
  throw 'Ejecutar desde una copia completa de la rama de diagnostico; faltan archivos de referencia.'
}
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Falta Node.js. No se modifico el proyecto remoto.'
}
if (!(Get-Command clasp -ErrorAction SilentlyContinue)) {
  throw 'Falta clasp o no esta disponible en PATH. No se instala automaticamente.'
}
if ($ScriptId -notmatch '^[A-Za-z0-9_-]{20,}$') {
  throw 'ScriptId no parece valido. Revisar el ID en Configuracion del proyecto Apps Script.'
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('staging-audit-' + [guid]::NewGuid().ToString('N'))
$headFolder = Join-Path $tempRoot 'HEAD'
$versionFolder = Join-Path $tempRoot 'VERSION'
New-Item -ItemType Directory -Path $headFolder -Force | Out-Null

function Read-Clone([string]$workFolder, [string[]]$claspArgs) {
  Push-Location $workFolder
  try {
    # Solo CLONE: una descarga de codigo en el directorio temporal privado.
    # No mostrar los logs de clasp porque pueden contener identificadores.
    $null = & clasp @claspArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw 'No fue posible leer el proyecto con clasp; revisar autenticacion y permisos.'
    }
    $found = Get-ChildItem -LiteralPath $workFolder -File -Recurse |
      Where-Object { $_.BaseName -eq 'Orquestador' -and $_.Extension -in @('.js', '.gs') } |
      Select-Object -First 1
    if (!$found) { throw 'La descarga no incluyo Orquestador.js/Orquestador.gs.' }
    return $found.FullName
  }
  finally { Pop-Location }
}

try {
  Write-Output 'AUDITORIA STAGING - SOLO LECTURA'
  Write-Output '1) Comparando HEAD remoto con Orquestador.js del checkout de GitHub...'
  $headFile = Read-Clone -workFolder $headFolder -claspArgs @('clone', $ScriptId)
  & node $auditor --file $headFile --compare-file $reference
  if ($LASTEXITCODE -ne 0) {
    throw 'La comparacion de HEAD no pudo completarse.'
  }

  if ($VersionNumber -gt 0) {
    New-Item -ItemType Directory -Path $versionFolder -Force | Out-Null
    Write-Output ('2) Comparando VERSION INMUTABLE numero ' + $VersionNumber + ' con GitHub...')
    $versionFile = Read-Clone -workFolder $versionFolder -claspArgs @('clone', $ScriptId, [string]$VersionNumber)
    & node $auditor --file $versionFile --compare-file $reference
    if ($LASTEXITCODE -ne 0) {
      throw 'La comparacion de version inmutable no pudo completarse.'
    }
  } else {
    Write-Output '2) Version inmutable NO comprobada: repetir con -VersionNumber N.'
    Write-Output '   Obtener N desde Apps Script > Implementar > Administrar implementaciones.'
  }

  Write-Output '3) Resultado: inspeccion estatica. Ningun archivo se subio ni se alteraron triggers o ejecuciones.'
  Write-Output '4) Solo si ambas versiones y pruebas son coherentes evaluar despliegue con aprobacion.'
}
finally {
  if ($KeepTemp) {
    Write-Output 'Copia temporal conservada LOCALMENTE por KeepTemp. Tratarla como privada y borrarla al terminar.'
    # Se evita imprimir la ruta para no revelar identificadores privados.
  }
  elseif (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
