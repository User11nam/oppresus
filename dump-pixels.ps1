# Dumps assets/district_map.png to tools/map_pixels.bin as raw RGB bytes.
# Header: width (uint32 LE), height (uint32 LE), then width*height*3 bytes (R,G,B).
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$img = [System.Drawing.Bitmap]::FromFile((Join-Path $root "assets\district_map.png"))
$w = $img.Width; $h = $img.Height
$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$stride = $data.Stride
$buf = New-Object byte[] ($stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $buf.Length)
$img.UnlockBits($data); $img.Dispose()
$out = New-Object byte[] (8 + $w * $h * 3)
[BitConverter]::GetBytes([uint32]$w).CopyTo($out, 0)
[BitConverter]::GetBytes([uint32]$h).CopyTo($out, 4)
$o = 8
for ($y = 0; $y -lt $h; $y++) {
  $row = $y * $stride
  for ($x = 0; $x -lt $w; $x++) {
    $i = $row + $x * 3
    $out[$o] = $buf[$i + 2]; $out[$o + 1] = $buf[$i + 1]; $out[$o + 2] = $buf[$i]; $o += 3
  }
}
[System.IO.File]::WriteAllBytes((Join-Path $PSScriptRoot "map_pixels.bin"), $out)
"Wrote ${w}x${h}"
