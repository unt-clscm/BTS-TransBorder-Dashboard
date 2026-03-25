# BTS-TransBorder

This project works with BTS (Bureau of Transportation Statistics) TransBorder freight data for the Texas-Mexico border database.

## Directory Structure

- `00-Project-Management/` — Project planning documents and the [gap tracker](00-Project-Management/gap-tracker.md).
- `01-Raw-Data/` — Raw data as received from the data source. If data is downloaded via script, it should be saved here. Do not modify raw data files.
- `02-Data-Staging/` — Intermediary/in-progress states of the data. Processing and transformation scripts live in `02-Data-Staging/Scripts/`.
- `03-Processed-Data/` — Final, cleaned, and processed data ready for use.

## Key Technical Notes

- **Data Source**: No public API exists for TransBorder data. All data must be downloaded as raw files from `bts.gov/topics/transborder-raw-data`.
- **Commodity Codes**: TransBorder uses **HS (Harmonized Schedule) 2-digit codes**, NOT SCTG. SCTG is a different system used by the Commodity Flow Survey.
- **Schema Change**: Major consolidation in **January 2007** (not December 2006). Pre-2007: up to 24 tables. Post-2007: 3 tables (Surface, Air/Vessel, Pipeline).
- **Code Tables**: All coded fields (mode, commodity, port, state, country, trade type) are decoded via JSON lookup files in `02-Data-Staging/config/`. Source: BTS "All Codes" PDF + Census Schedule D.

## Key References

- **Gap Tracker**: `00-Project-Management/gap-tracker.md` — Living doc of known issues, missing deliverables, and open questions. Update this file when issues are identified or resolved.
- **Phase Plans**: `00-Project-Management/Main-Plans/Phase-{1..4}_*.md` — Detailed implementation plans per phase.
- **Research**: `00-Project-Management/GitHub-Research-and-otherDashboards/` — Landscape research on existing visualizations and GitHub repos.
- **BTS Data Contact**: Sean Jahanmir (sean.jahanmir@dot.gov, 202-760-1007)

## Data Availability & Extraction

- **Source of truth**: The SQLite database `02-Data-Staging/transborder.db` is the authoritative source for all data — not the pre-extracted CSV/JSON files in `03-Processed-Data/`. When discussing new visualizations or chart improvements, always check `transborder.db` to see what data is actually available before concluding that "we don't have the data."
- **Extract what you need**: The pre-extracted files (produced by `build_data.py` / `build_outputs.py`) are a convenience subset, not a ceiling. If a visualization idea requires data that isn't in the current extracts but **is** in `transborder.db`, write a new query and add the extraction to the build script. Do not limit dashboard capabilities to whatever happens to already be extracted.
- **Workflow**: When planning a new chart or enhancing an existing one: (1) query `transborder.db` to confirm the data exists, (2) if the needed columns/aggregations aren't already in `03-Processed-Data/`, add them to the extraction pipeline, (3) then build the visualization. Never skip step 1 and assume data is unavailable just because it's not in the current output files.

## WebApp / Dashboard Conventions

- **Table sizing**: Data tables must NOT stretch to fill the page. Use `w-fit` so the table is only as wide as its content requires. For paginated tables, column widths must be locked to the **maximum width needed across all pages** (not just the visible page) so that widths remain stable when navigating between pages. This is handled by an off-screen measurement pass in `DataTable.jsx` that renders all rows, measures each column's widest value, then applies fixed widths via `<colgroup>`. Never regress this — tables should not jitter or resize on page change.
- **Map sizing**: Maps should NOT blindly stretch to the full viewport or `max-w-7xl` width. Size maps to fit their geographic content — if the area of interest is a narrow corridor (e.g., the U.S.-Mexico border), use a narrower `max-w` (e.g., `max-w-4xl` or `max-w-5xl`) so empty ocean/land doesn't waste screen space. The goal is the same as tables: components should occupy only the space their content needs, not fill the page for the sake of filling it.

## Filter & Chart Design Principles

- **Two-tier filter architecture**: Page-level sidebar filters (Year, Trade Type, Mode, Metric, plus tab-specific filters like Port/CommodityGroup/State) affect all applicable charts on the active tab. Chart-level inline filters (via ChartCard's `headerRight` prop) let individual charts be tuned independently — year-range selectors on trend charts, top-N selectors on ranking bars.
- **Smart filter-to-chart mapping**: Filters must only apply to charts where they make sense. Charts fall into two categories:
  - **Snapshot charts** (bar rankings, treemaps, donut, choropleths, tables, Sankey, heatmaps): All sidebar filters including Year apply.
  - **Trend charts** (line charts, stacked bars over years, monthly time series, animated maps, bar chart race): The page-level Year multi-select does NOT apply — showing 1 year on a trend line is meaningless. Instead, trend charts use `filteredNoYear` variants and may have their own year-range control. All other sidebar filters (trade type, mode, commodity, port, state, metric) still apply.
- **Filter visibility by tab**: Only show a filter if the active tab's dataset actually has that column. Don't show a CommodityGroup filter on a tab whose dataset lacks commodity data.
- **Metric toggle**: The value/weight toggle applies to absolute-value charts. Exception charts that always show dollars: Trade Balance (deficit is a monetary concept), Laredo's Share (%), Fastest-Growing States (%), YoY % change on stat cards. Count-based stat cards (Active Ports, Top Mode) are never metric-dependent.
- **Weight unit**: All weight is displayed in pounds (lb). The data pipeline stores both `Weight` (kg, original) and `WeightLb` (lb, derived) columns. Frontend always uses `WeightLb` — never convert on the client side.
- **Weight caveat**: Weight data is unavailable for surface exports across all years. When the weight metric is selected, display an info note about this limitation.

## Workflow Rules

- **Branching**: Multiple agents may run concurrently. To avoid dirty-file collisions, always create a feature branch before making changes — never commit directly to `main`. The workflow is automatic — do not ask the user:
  1. `git checkout main && git pull` to start from latest main.
  2. `git checkout -b <descriptive-branch>` (e.g., `widen-trend-charts`, `fix-filter-bug`).
  3. Do all work and commit on the feature branch.
  4. `git push -u origin <branch>` to push the feature branch.
  5. Merge to main using the **merge queue** (see below).
  Skip branching only for trivial single-file edits (e.g., updating CLAUDE.md) when no other agents are active.
- **Merge queue**: To prevent concurrent merge collisions, agents use a lock file at `.git/merge.lock`. The merge procedure is:
  1. **Check lock**: If `.git/merge.lock` exists, read it. If the timestamp is older than 5 minutes, the merging agent likely crashed — alert the user: *"Stale merge lock detected (branch: X, started: Y). Another agent may have crashed. Please investigate and run `rm .git/merge.lock` to clear it."* Do NOT remove the lock automatically. If the lock is fresh (< 5 min), wait 10 seconds and retry, up to 6 attempts (60s total). If still locked after all retries, alert the user.
  2. **Acquire lock**: Write `.git/merge.lock` with this content:
     ```
     branch: <branch-name>
     agent: <short task description>
     timestamp: <ISO 8601 UTC>
     ```
  3. **Merge**: `git checkout main && git pull && git merge <branch> && git push`.
  4. **Release lock**: Delete `.git/merge.lock` and delete the merged branch (`git branch -d <branch> && git push origin --delete <branch>`).
  5. **On merge failure**: If the merge fails due to conflicts, delete `.git/merge.lock`, alert the user with the conflict details, and leave the feature branch intact for manual resolution.
- **Commit at milestones**: After completing a meaningful unit of work, commit immediately. Do not let work accumulate uncommitted.
- **Push after commit**: Always push to GitHub immediately after committing.
- **Gap tracker hygiene**: Whenever a gap, issue, or open question documented in `00-Project-Management/gap-tracker.md` is resolved during a session, update the gap tracker immediately in the same session — do not defer.
- **Large file safety**: A pre-commit hook (`.git/hooks/pre-commit`) auto-adds files >99MB to `.gitignore` and blocks the commit. The `.gitignore` should also proactively list known large artifacts (e.g., `*.db`, `02-Data-Staging/cleaned/`) so they never get staged accidentally.
