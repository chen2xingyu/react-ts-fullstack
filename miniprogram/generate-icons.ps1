Add-Type -AssemblyName System.Drawing

$iconSize = 48
$normalColor = [System.Drawing.Color]::FromArgb(153, 153, 153)
$activeColor = [System.Drawing.Color]::FromArgb(59, 130, 246)

function Create-Icon {
    param([string]$filePath, [System.Drawing.Color]$color, [string]$shape)
    
    $bitmap = New-Object System.Drawing.Bitmap($iconSize, $iconSize)
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $pen = New-Object System.Drawing.Pen($color, 3)
    $brush = New-Object System.Drawing.SolidBrush($color)
    
    if ($shape -eq "home") {
        $roof = @(
            (New-Object System.Drawing.Point(24, 6)),
            (New-Object System.Drawing.Point(6, 24)),
            (New-Object System.Drawing.Point(42, 24))
        )
        $g.FillPolygon($brush, $roof)
        $g.FillRectangle($brush, 10, 24, 28, 20)
    }
    elseif ($shape -eq "book") {
        $g.FillRectangle($brush, 8, 8, 14, 32)
        $g.FillRectangle($brush, 26, 8, 14, 32)
        $g.DrawLine($pen, 24, 8, 24, 40)
    }
    elseif ($shape -eq "user") {
        $g.FillEllipse($brush, 16, 6, 16, 16)
        $body = @(
            (New-Object System.Drawing.Point(8, 44)),
            (New-Object System.Drawing.Point(40, 44)),
            (New-Object System.Drawing.Point(36, 24)),
            (New-Object System.Drawing.Point(12, 24))
        )
        $g.FillPolygon($brush, $body)
    }
    
    $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bitmap.Dispose()
    Write-Host "Created: $filePath"
}

$dir = "d:\reactTs\miniprogram\src\assets\tabbar"

Create-Icon "$dir\home.png" $normalColor "home"
Create-Icon "$dir\book.png" $normalColor "book"
Create-Icon "$dir\user.png" $normalColor "user"
Create-Icon "$dir\home-active.png" $activeColor "home"
Create-Icon "$dir\book-active.png" $activeColor "book"
Create-Icon "$dir\user-active.png" $activeColor "user"

$pen.Dispose()
$brush.Dispose()
Write-Host "All tabbar icons generated!"
