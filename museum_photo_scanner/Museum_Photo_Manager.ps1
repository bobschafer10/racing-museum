
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = "Museum Photo Manager v1"
$form.Size = New-Object System.Drawing.Size(760, 520)
$form.StartPosition = "CenterScreen"
$form.MaximizeBox = $false
$form.FormBorderStyle = "FixedDialog"

$font = New-Object System.Drawing.Font("Segoe UI", 10)
$form.Font = $font

$title = New-Object System.Windows.Forms.Label
$title.Text = "Museum Photo Manager"
$title.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 18)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(24, 20)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Safe inventory scan — nothing is renamed, moved, deleted, or uploaded."
$subtitle.AutoSize = $true
$subtitle.Location = New-Object System.Drawing.Point(26, 58)
$form.Controls.Add($subtitle)

# Photo folder
$lblPhoto = New-Object System.Windows.Forms.Label
$lblPhoto.Text = "Photo folder"
$lblPhoto.AutoSize = $true
$lblPhoto.Location = New-Object System.Drawing.Point(26, 105)
$form.Controls.Add($lblPhoto)

$txtPhoto = New-Object System.Windows.Forms.TextBox
$txtPhoto.Location = New-Object System.Drawing.Point(28, 128)
$txtPhoto.Size = New-Object System.Drawing.Size(590, 28)
$txtPhoto.Text = "$env:USERPROFILE\Desktop\PHOTOS II"
$form.Controls.Add($txtPhoto)

$btnPhoto = New-Object System.Windows.Forms.Button
$btnPhoto.Text = "Browse..."
$btnPhoto.Location = New-Object System.Drawing.Point(630, 126)
$btnPhoto.Size = New-Object System.Drawing.Size(95, 31)
$form.Controls.Add($btnPhoto)

# Output folder
$lblOutput = New-Object System.Windows.Forms.Label
$lblOutput.Text = "Output folder"
$lblOutput.AutoSize = $true
$lblOutput.Location = New-Object System.Drawing.Point(26, 178)
$form.Controls.Add($lblOutput)

$txtOutput = New-Object System.Windows.Forms.TextBox
$txtOutput.Location = New-Object System.Drawing.Point(28, 201)
$txtOutput.Size = New-Object System.Drawing.Size(590, 28)
$txtOutput.Text = "$env:USERPROFILE\Desktop\Museum Photo Manager"
$form.Controls.Add($txtOutput)

$btnOutput = New-Object System.Windows.Forms.Button
$btnOutput.Text = "Browse..."
$btnOutput.Location = New-Object System.Drawing.Point(630, 199)
$btnOutput.Size = New-Object System.Drawing.Size(95, 31)
$form.Controls.Add($btnOutput)

# Status labels
$lblFound = New-Object System.Windows.Forms.Label
$lblFound.Text = "Photos found: 0"
$lblFound.AutoSize = $true
$lblFound.Location = New-Object System.Drawing.Point(28, 263)
$form.Controls.Add($lblFound)

$lblScanned = New-Object System.Windows.Forms.Label
$lblScanned.Text = "Scanned: 0"
$lblScanned.AutoSize = $true
$lblScanned.Location = New-Object System.Drawing.Point(250, 263)
$form.Controls.Add($lblScanned)

$lblErrors = New-Object System.Windows.Forms.Label
$lblErrors.Text = "Errors: 0"
$lblErrors.AutoSize = $true
$lblErrors.Location = New-Object System.Drawing.Point(450, 263)
$form.Controls.Add($lblErrors)

$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = New-Object System.Drawing.Point(28, 295)
$progress.Size = New-Object System.Drawing.Size(697, 26)
$progress.Minimum = 0
$progress.Maximum = 100
$form.Controls.Add($progress)

$txtCurrent = New-Object System.Windows.Forms.Label
$txtCurrent.Text = "Ready."
$txtCurrent.AutoEllipsis = $true
$txtCurrent.Location = New-Object System.Drawing.Point(28, 333)
$txtCurrent.Size = New-Object System.Drawing.Size(697, 44)
$form.Controls.Add($txtCurrent)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "Start Inventory Scan"
$btnStart.Location = New-Object System.Drawing.Point(28, 397)
$btnStart.Size = New-Object System.Drawing.Size(210, 44)
$btnStart.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 10)
$form.Controls.Add($btnStart)

$btnOpen = New-Object System.Windows.Forms.Button
$btnOpen.Text = "Open Output Folder"
$btnOpen.Location = New-Object System.Drawing.Point(253, 397)
$btnOpen.Size = New-Object System.Drawing.Size(180, 44)
$btnOpen.Enabled = $false
$form.Controls.Add($btnOpen)

$btnClose = New-Object System.Windows.Forms.Button
$btnClose.Text = "Close"
$btnClose.Location = New-Object System.Drawing.Point(615, 397)
$btnClose.Size = New-Object System.Drawing.Size(110, 44)
$form.Controls.Add($btnClose)

$folderDialog = New-Object System.Windows.Forms.FolderBrowserDialog

$btnPhoto.Add_Click({
    $folderDialog.Description = "Select the folder containing the photos"
    $folderDialog.SelectedPath = $txtPhoto.Text
    if ($folderDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $txtPhoto.Text = $folderDialog.SelectedPath
    }
})

$btnOutput.Add_Click({
    $folderDialog.Description = "Select the output folder"
    $folderDialog.SelectedPath = $txtOutput.Text
    if ($folderDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $txtOutput.Text = $folderDialog.SelectedPath
    }
})

$btnOpen.Add_Click({
    if (Test-Path $txtOutput.Text) {
        Start-Process explorer.exe $txtOutput.Text
    }
})

$btnClose.Add_Click({ $form.Close() })

function Get-ImageDimensions {
    param([string]$Path)
    try {
        $img = [System.Drawing.Image]::FromFile($Path)
        $w = $img.Width
        $h = $img.Height
        $fmt = $img.RawFormat.Guid.ToString()
        $img.Dispose()
        return @($w, $h, $fmt, "")
    }
    catch {
        return @("", "", "", $_.Exception.Message)
    }
}

$btnStart.Add_Click({
    $photoFolder = $txtPhoto.Text.Trim()
    $outputFolder = $txtOutput.Text.Trim()

    if (-not (Test-Path $photoFolder)) {
        [System.Windows.Forms.MessageBox]::Show(
            "The photo folder does not exist:`n$photoFolder",
            "Folder Not Found",
            "OK",
            "Warning"
        )
        return
    }

    if (-not (Test-Path $outputFolder)) {
        New-Item -ItemType Directory -Path $outputFolder -Force | Out-Null
    }

    $extensions = @(".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff")
    $files = Get-ChildItem -Path $photoFolder -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() }

    $total = $files.Count
    $lblFound.Text = "Photos found: $total"
    $lblScanned.Text = "Scanned: 0"
    $lblErrors.Text = "Errors: 0"
    $progress.Value = 0

    if ($total -eq 0) {
        [System.Windows.Forms.MessageBox]::Show(
            "No supported image files were found.",
            "Nothing Found",
            "OK",
            "Information"
        )
        return
    }

    $btnStart.Enabled = $false
    $btnPhoto.Enabled = $false
    $btnOutput.Enabled = $false
    $btnOpen.Enabled = $false

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $csvPath = Join-Path $outputFolder "museum_photo_inventory_$timestamp.csv"
    $errorPath = Join-Path $outputFolder "museum_photo_scan_errors_$timestamp.txt"

    $results = New-Object System.Collections.Generic.List[object]
    $errors = 0
    $count = 0

    foreach ($file in $files) {
        $count++
        $txtCurrent.Text = "Scanning $count of $total: $($file.FullName)"
        $pct = [Math]::Floor(($count / $total) * 100)
        if ($pct -gt 100) { $pct = 100 }
        $progress.Value = $pct
        $lblScanned.Text = "Scanned: $count"
        [System.Windows.Forms.Application]::DoEvents()

        $sha = ""
        $width = ""
        $height = ""
        $format = ""
        $status = "SCANNED"
        $err = ""

        try {
            $sha = (Get-FileHash -Algorithm SHA256 -Path $file.FullName -ErrorAction Stop).Hash.ToLowerInvariant()
            $dims = Get-ImageDimensions -Path $file.FullName
            $width = $dims[0]
            $height = $dims[1]
            $format = $dims[2]
            if ($dims[3]) {
                $status = "DIMENSION_ERROR"
                $err = $dims[3]
                $errors++
            }
        }
        catch {
            $status = "HASH_ERROR"
            $err = $_.Exception.Message
            $errors++
        }

        $results.Add([PSCustomObject]@{
            full_path = $file.FullName
            folder = $file.DirectoryName
            original_filename = $file.Name
            extension = $file.Extension.ToLowerInvariant()
            file_size_bytes = $file.Length
            modified_time = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            width = $width
            height = $height
            image_format_guid = $format
            sha256 = $sha
            scan_status = $status
            error_message = $err
        })

        $lblErrors.Text = "Errors: $errors"

        if (($count % 250) -eq 0) {
            $results | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
        }
    }

    $results | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8

    $bad = $results | Where-Object { $_.scan_status -ne "SCANNED" }
    if ($bad.Count -gt 0) {
        $bad | Format-List * | Out-File -FilePath $errorPath -Encoding UTF8
    }

    $txtCurrent.Text = "Complete. Inventory saved to: $csvPath"
    $progress.Value = 100
    $btnStart.Enabled = $true
    $btnPhoto.Enabled = $true
    $btnOutput.Enabled = $true
    $btnOpen.Enabled = $true

    [System.Windows.Forms.MessageBox]::Show(
        "Inventory scan complete.`n`nPhotos scanned: $total`nErrors: $errors`n`nSaved to:`n$csvPath",
        "Scan Complete",
        "OK",
        "Information"
    )
})

[void]$form.ShowDialog()
