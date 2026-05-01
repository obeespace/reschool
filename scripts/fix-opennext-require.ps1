$ErrorActionPreference = "Stop"

$openNextDir = Join-Path $PWD ".open-next"
if (-not (Test-Path $openNextDir)) {
  Write-Host "OpenNext output not found, skipping patch."
  exit 0
}

$needleMin = 'throw Error(''Dynamic require of "''+x+''" is not supported'')'
$fallbackMin = @"
if(typeof x==="string"){const __x=x.replaceAll("\\","/");if(__x.endsWith("/.next/server/middleware-manifest.json")||__x.endsWith("/server/middleware-manifest.json"))return{version:3,middleware:{},functions:{},sortedMiddleware:[]};if(__x.endsWith("/.next/server/functions-config-manifest.json")||__x.endsWith("/server/functions-config-manifest.json"))return{version:1,functions:{}};}
throw Error('Dynamic require of "'+x+'" is not supported')
"@

$needlePretty = 'throw Error(''Dynamic require of "'' + x + ''" is not supported'');'
$fallbackPretty = @"
if (typeof x === "string") {
  const __x = x.replaceAll("\\", "/");
  if (__x.endsWith("/.next/server/middleware-manifest.json") || __x.endsWith("/server/middleware-manifest.json")) return { version: 3, middleware: {}, functions: {}, sortedMiddleware: [] };
  if (__x.endsWith("/.next/server/functions-config-manifest.json") || __x.endsWith("/server/functions-config-manifest.json")) return { version: 1, functions: {} };
}
throw Error('Dynamic require of "' + x + '" is not supported');
"@

$patchedFiles = 0
$files = Get-ChildItem $openNextDir -Recurse -File -Filter "*.mjs"
foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $updated = $content
  if ($updated.Contains($needleMin)) {
    $updated = $updated.Replace($needleMin, $fallbackMin)
  }
  if ($updated.Contains($needlePretty)) {
    $updated = $updated.Replace($needlePretty, $fallbackPretty)
  }
  if ($updated -ne $content) {
    Set-Content -Path $file.FullName -Value $updated -NoNewline
    $patchedFiles += 1
  }
}

if ($patchedFiles -gt 0) {
  Write-Host "Patched OpenNext dynamic require shim in $patchedFiles file(s)."
  exit 0
}

Write-Host "No dynamic require shims found to patch."
