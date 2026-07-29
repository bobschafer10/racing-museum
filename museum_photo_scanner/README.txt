MUSEUM PHOTO MANAGER v1
=======================

This version creates a safe inventory of the actual photo files.

It does NOT:
- Rename files
- Move files
- Delete files
- Upload files
- Change Supabase

HOW TO RUN
----------

1. Extract this ZIP file into a normal folder.
2. Double-click START_MUSEUM_PHOTO_MANAGER.bat.
3. The program should automatically use:
   C:\Users\<your name>\Desktop\PHOTOS II
4. Confirm or change the photo folder using Browse.
5. Confirm or change the output folder.
6. Click Start Inventory Scan.

OUTPUT
------

The program creates:
- museum_photo_inventory_<date>.csv
- museum_photo_scan_errors_<date>.txt, only when errors occur

The CSV includes:
- Full original path
- Original filename
- Folder
- Extension
- File size
- Modified date
- Width and height
- SHA-256 exact-file fingerprint
- Scan status and errors

NEXT STEP
---------

Attach the generated CSV to ChatGPT. It will be reconciled against the
Supabase photo export to identify exact duplicate files and build the
true photo review queue.

IMPORTANT
---------

The program may take a while to read tens of thousands of photos.
Do not close the window during the scan.

This first desktop version uses SHA-256 exact-file matching. Perceptual
image matching for resized or recompressed photos will be added in the
next stage.
