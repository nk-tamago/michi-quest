Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem -Filter *.png

foreach ($file in $files) {
    $img = [System.Drawing.Image]::FromFile($file.FullName)
    $bmp = New-Object System.Drawing.Bitmap 512,512
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)

    $graphics.DrawImage($img, 0, 0, 512, 512)

    $output = Join-Path $file.DirectoryName ("resized_" + $file.Name)
    $bmp.Save($output, [System.Drawing.Imaging.ImageFormat]::Jpeg)

    $graphics.Dispose()
    $bmp.Dispose()
    $img.Dispose()
}
