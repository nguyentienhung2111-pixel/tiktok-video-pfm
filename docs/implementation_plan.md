# Fix Data Mapping & Display Bugs in TikTok Video Performance DECOCO

## Problem Summary

After uploading data from TikTok Seller Center Excel files, the dashboard shows incorrect data:
1. **Views (Lượt xem) = 0 everywhere** — Despite `raw_data.VV` containing correct values (e.g., 680,317)
2. **GMV showing incorrect/jumpy values** — Multiple GMV-related columns causing confusion and potential wrong mapping
3. **Dashboard uses all data instead of paginated data** — Content team page passes `videos` (up to 5000) instead of `paginatedVideos` to VideoTable

## Root Cause Analysis

### Bug 1: Views Always 0

The `COLUMN_MAPPING` in UploadForm.tsx line 25 does have `'VV': 'views'`. However, the issue is more subtle:

**The problem is in the `mapRow` function (line 152-197)**. When iterating over Excel row keys, the `VV` column value from TikTok's Excel export may contain:
- String values like `"680,317"` or `"680.317"` (with thousands separators)
- The `parseNum` function should handle this, BUT if the actual column header in the Excel has invisible characters (BOM, NBSP, zero-width spaces) attached to `"VV"`, the `.trim()` won't remove them

**More critically**: Looking at the actual Excel column structure from PRD §3.2:
- Column 7 is `VV` — this IS mapped
- But the header row detection scans first 15 rows — if the Excel has merged cells or unusual formatting, the header detection could miss the `VV` column

**The REAL issue**: After investigating via the database query, we confirmed:
- `raw_data` contains `"VV": "680317"` (correct value present in raw_data)  
- `views` in DB = 0 (not mapped)

This means the `mapRow` function's `for` loop DID NOT find a match for the `VV` key. The most likely cause is **Unicode normalization** — the Excel header `VV` may use full-width characters or have hidden characters that pass through `.trim()`.

### Bug 2: GMV Issues

Two GMV-related columns in the Excel:
1. `Tổng giá trị hàng hóa (Video) (₫)` — Total merchandise value (mapped to `gmv`)
2. `GMV quy ra từ video bán hàng (₫)` — GMV attributed to video (also mapped to `gmv`)

According to PRD §3.2:
- Column 18: `Tổng giá trị hàng hóa (Video) (₫)` — Total merchandise value
- Column 20: `GMV quy ra từ video bán hàng (₫)` — GMV attributed to video

**These are DIFFERENT values.** When both columns exist in the same row, the later one OVERWRITES the earlier one in the `mapRow` loop. The correct GMV field per PRD should be column 20 `GMV quy ra từ video bán hàng (₫)`.

Additionally, column 17 `Số món bán ra từ video` is "items sold" but is currently mapped to `orders` — this is incorrect. The correct `orders` column is column 16 `Đơn hàng`.

### Bug 3: Wrong Data Passed to VideoTable

In `content/page.tsx` line 248:
```tsx
<VideoTable videos={videos} users={users} onRefresh={fetchData} />
```
This passes the full `videos` array (up to 5000 records from summary query) instead of `paginatedVideos`.

Similarly in `dashboard/page.tsx` line 223:
```tsx
<VideoTable videos={videos} users={users} onRefresh={fetchData} />
```
This also uses the summary data (up to 5000) rather than actual paginated data from the table query. The dashboard page fetches paginated data but never uses it in the VideoTable — the `videoData` from `tableQuery` is never stored!

### Bug 4: Missing `format` import in content/page.tsx

Line 57 uses `format(date.from, 'yyyy-MM-dd')` but `format` is not imported from `date-fns`.

## Proposed Changes

### 1. Upload Form — Fix Column Mapping & Parsing

#### [MODIFY] [UploadForm.tsx](file:///e:/Obsidian%20Data/TikTok%20Video%20Performance%20DECOCO%20App/src/components/admin/UploadForm.tsx)

**Changes:**
1. **Robust header matching**: Normalize column headers by stripping all non-printable characters, Unicode normalization, and case-insensitive matching
2. **Fix GMV column priority**: Ensure `GMV quy ra từ video bán hàng (₫)` takes priority over `Tổng giá trị hàng hóa (Video) (₫)` — map `Tổng giá trị hàng hóa` to a separate field `total_merchandise_value` (or just skip it since it's not the right GMV)
3. **Fix orders mapping**: Remove `Số món bán ra từ video` from `orders` mapping (that's items_sold, not orders)
4. **Add GPM mapping**: Map `GPM (₫)` to `gpm` field
5. **Add more Vietnamese header variations** for robustness
6. **Add a data re-processing capability**: After fixing the mapping, we need to re-process existing raw_data to fix the already-uploaded records

---

### 2. Dashboard Page — Fix Data Flow & Pagination

#### [MODIFY] [dashboard/page.tsx](file:///e:/Obsidian%20Data/TikTok%20Video%20Performance%20DECOCO%20App/src/app/(main)/dashboard/page.tsx)

**Changes:**
1. Store paginated data separately from summary data
2. Pass paginated data to VideoTable instead of summary data

---

### 3. Content Team Page — Fix Data Flow & Missing Import

#### [MODIFY] [content/page.tsx](file:///e:/Obsidian%20Data/TikTok%20Video%20Performance%20DECOCO%20App/src/app/(main)/team/content/page.tsx)

**Changes:**
1. Add missing `format` import from `date-fns`
2. Pass `paginatedVideos` to VideoTable instead of `videos`
3. Add pagination UI (currently missing)

---

### 4. Data Migration Script — Fix Existing Records

#### [NEW] [fix-views-data.tsx](file:///e:/Obsidian%20Data/TikTok%20Video%20Performance%20DECOCO%20App/src/app/(main)/admin/upload/fix-data-button.tsx)

Create a "Re-process Data" button in the upload page that:
1. Fetches all videos from the database in batches
2. Re-extracts `views`, `gmv`, `orders`, `gpm`, `likes`, `comments`, `shares` from `raw_data` using the fixed mapping logic
3. Updates each record with the correct values

> [!IMPORTANT]
> This is critical because ~10,000+ records already in the database have `views = 0` and potentially wrong GMV values. Simply fixing the upload logic won't retroactively fix existing data.

---

## Verification Plan

### Automated Tests
1. After deploying, navigate to the dashboard and verify:
   - Total Views > 0 (was showing 0)
   - GMV values match the correct column from raw_data
   - Orders show correct numbers
2. Check individual video records to confirm views match `raw_data.VV`
3. Verify pagination works correctly on all pages

### Manual Verification
1. Login to app as admin
2. Run the "Re-process Data" function to fix existing records
3. Compare dashboard numbers with TikTok Seller Center data
4. Upload a new file and verify the new records have correct views and GMV
