# SD Neighborhood Issue Tracker

## Team

**Team name:** Solo Dolo

**Team members:** Jared Wilber

## Problem Statement

San Diego residents report hundreds of thousands of quality-of-life issues each year through the city's Get It Done program -- illegal dumping, potholes, graffiti, encampments, parking violations, and more. But there's no easy way to explore this data spatially, filter across categories, or understand trends over time. City staff, journalists, and engaged residents lack a fast, interactive tool to drill down into neighborhood-level patterns and ask questions like: "What are the most common issues in Mid-City? How has encampment reporting changed since 2020? Which neighborhoods have the lowest closure rates?"

## What It Does

This is a browser-based interactive dashboard that visualizes nearly 1 million Get It Done 311 service requests across San Diego (2016--present). Users can cross-filter by issue type, neighborhood, status, and time period using linked bar charts, a brushable timeline, and a spatial map selection. Every view updates instantly -- click a bar to filter by category, brush the timeline to narrow a date range, or Shift+drag on the map to select a geographic area. KPI cards show real-time summary statistics (total reports, closure rate, average days to close, top issue) that update with every filter. All data processing happens entirely in the browser using DuckDB-WASM -- no backend required.

## Data Sources

- **Get It Done 311 Requests** -- [data.sandiego.gov/datasets/get-it-done-311](https://data.sandiego.gov/datasets/get-it-done-311/)
  - Open requests CSV + closed requests CSVs (2016--2026) from `seshat.datasd.org`
  - ~974K records covering service type, status, location, neighborhood, dates, and case age
  - Exported to a 19MB Parquet file for efficient in-browser loading

## Architecture / Approach

The entire application was built in a single session using Claude Code (Claude Opus). The process involved significant back-and-forth iteration with the APIs for DuckDB, Mosaic, and vgplot to take advantage of modern data tooling and render all ~967K data points interactively in the browser.

**Key technical decisions and challenges:**

- **DuckDB-WASM** loads a Parquet file directly in the browser -- no server, no API calls at runtime. All ~967K records are queryable via SQL in milliseconds.
- **Mosaic + vgplot** provides the cross-filtering framework. We use `Selection.crossfilter()` to link bar charts, the timeline, and a custom map client so that selecting in any view filters all others. Getting this to work required deep iteration with Claude on Mosaic's clause system, preaggregator behavior, and event dispatch (`activate` vs `update`, clause metadata, and predicate formats).
- **MapLibre GL + deck.gl** renders the tile map with ScatterplotLayer (colored by service type) and HeatmapLayer (density mode). A custom `MosaicClient` bridges the crossfilter selection to the map by querying filtered IDs from DuckDB and filtering a pre-loaded point array client-side for fast updates.
- **Spatial crossfilter from map to charts** was the hardest integration. Mosaic's preaggregator creates materialized views that don't include lat/lng columns, so spatial predicates broke histogram queries. The solution: disable preaggregation and use `sql` tagged template literals for the map brush predicate.
- **Usability focus:** FT-inspired visual theme (Space Mono, cream palette), background bars showing full distribution for context, interactive tooltips on map points, draggable map selection rectangles, and a welcome modal explaining how to use the tool.

Claude is not used inside the running application -- it was used as the development tool to build the entire codebase, debug Mosaic integration issues, and iterate on the UI/UX.

**Stack:** React + TypeScript, Vite, DuckDB-WASM, @uwdata/vgplot + Mosaic, MapLibre GL, deck.gl

## Links

- **Live app:** [sd-get-it-done-tracker.github.io](https://sd-get-it-done-tracker.github.io/)
- **Repo:** [github.com/jwilber/city-of-sd-hackathon](https://github.com/jwilber/city-of-sd-hackathon)

---

# Claude Community x City of SD Impact Lab

> **Disclaimer:** All data and resources linked below are subject to their respective terms of access and terms of service. Participants are responsible for reviewing and complying with applicable usage policies, licensing terms, API rate limits, and data use restrictions before accessing or incorporating any data into their projects.

### Discord: https://discord.gg/vzMDyb48

# Submission Deadline: 5pm

---

## 1. Open Data Portal

| Resource | Link | Notes |
|----------|------|-------|
| City of San Diego Open Data Portal | [data.sandiego.gov](https://data.sandiego.gov/) | Hundreds of machine-readable datasets. CSV, JSON, API access. |
| Open Data — All Datasets | [data.sandiego.gov/datasets](https://data.sandiego.gov/datasets/) | Browse/filter all available datasets. |
| Open Data — Getting Started | [data.sandiego.gov/get-started](https://data.sandiego.gov/get-started/) | Documentation and usage guides. |
| Open Source Projects | [data.sandiego.gov/open-source](https://data.sandiego.gov/open-source/) | City-maintained open source code on GitHub. |
| Government Publications (Library) | [sandiego.gov/public-library/govpub](https://www.sandiego.gov/public-library/govpub) | Historical and current government publications. |

### Hackathon Tips — Open Data
- Datasets cover topics including permits, code enforcement, police calls, traffic, budgets, and more.

---

## 2. Municipal Code

| Resource | Link | Notes |
|----------|------|-------|
| Municipal Code (Official) | [sandiego.gov/city-clerk/officialdocs/municipal-code](https://www.sandiego.gov/city-clerk/officialdocs/municipal-code) | Full code organized by chapter, article, division, section. HTML browsable. |
| Municipal Code (American Legal) | [codelibrary.amlegal.com](https://codelibrary.amlegal.com/codes/san_diego/latest/sandiego_regs/0-0-0-71708) | Searchable, cross-referenced. Good for programmatic text extraction. |
| Codes & Regulations (Dev Services) | [sandiego.gov/development-services/codes-regulations](https://www.sandiego.gov/development-services/codes-regulations) | Local amendments to California Building Standards Code (Title 24). 2025 CBC effective Jan 1, 2026; local amendments expected March–April 2026. |

### Hackathon Tips — Municipal Code
- The Municipal Code is HTML-structured with predictable chapter/section IDs.

---

## 3. Council Transcripts & Meeting Records

| Resource | Link | Notes |
|----------|------|-------|
| Council Meeting Documents (Agendas, Minutes, Results) | [sandiego.gov/city-clerk/city-council-docket-agenda](https://www.sandiego.gov/city-clerk/city-council-docket-agenda) | Official dockets, agendas, minutes, and result summaries. |
| Council Archived Videos (Granicus) | [sandiego.granicus.com](https://sandiego.granicus.com/ViewPublisher.php?view_id=3) | Video archives posted within 24–48 hours. Not an official record. |
| Committee Webcasts | [sandiego.granicus.com (view 31)](https://sandiego.granicus.com/ViewPublisher.php?view_id=31) | Additional webcasts for committee meetings. |
| Citywide Agendas & Minutes | [sandiego.gov/citywide-agendas-minutes](https://www.sandiego.gov/citywide-agendas-minutes) | Broader collection including all committee meetings. |
| Official City Documents | [sandiego.gov/city-clerk/official-city-documents](https://www.sandiego.gov/city-clerk/official-city-documents) | Charter, resolutions, ordinances, and council actions. |
| Digital Archives | [sandiego.gov/digitalarchives](https://www.sandiego.gov/digitalarchives) | Historical documents, photos, images, audio files. |
| Public Records Requests (NextRequest) | [sandiego.nextrequest.com](https://sandiego.nextrequest.com/) | 40,000+ searchable public records requests. |

### Hackathon Tips — Council Data
- Granicus video archives can be used with speech-to-text tools (e.g., Whisper) to generate searchable transcripts.
- The NextRequest portal is a goldmine for FOIA-style data if you need specific documents.

---

## 4. Permitting Codes & Guidelines

| Resource | Link | Notes |
|----------|------|-------|
| Building Permit Overview | [sandiego.gov/.../building-permit](https://www.sandiego.gov/development-services/permits/building-permit) | Requirements, exempt projects, permit types, how to apply. |
| Permits, Approvals & Inspections | [sandiego.gov/.../permits-inspections](https://www.sandiego.gov/development-services/permits-inspections) | Full hub for all permit and inspection processes. |
| Permits and Approvals | [sandiego.gov/.../permits](https://www.sandiego.gov/development-services/permits) | Overview of all available permit types. |
| Permits FAQs | [sandiego.gov/.../permits/faqs](https://www.sandiego.gov/development-services/permits/faqs) | Common questions about the permitting process. |
| San Diego Building Codes (UpCodes) | [up.codes/codes/san-diego](https://up.codes/codes/san-diego) | Third-party searchable building codes. Includes 2022 CBC viewer. |
| San Diego Building Code 2022 Viewer | [up.codes/viewer/san-diego/ca-building-code-2022](https://up.codes/viewer/san-diego/ca-building-code-2022) | Full-text viewer for Vol 1 & 2 of the 2022 California Building Code as adopted by San Diego. |

### Hackathon Tips — Permitting
- UpCodes has the most developer-friendly interface for code lookups.
- Building permit data may also appear in the Open Data Portal (see above).

## Submission Guidelines

Projects are submitted via MCP server. Add the submission server to Claude Code by running:

```bash
claude mcp add impact-lab-submissions --transport http https://mcp-submissions.casper-studios.workers.dev/mcp
```

For other MCP clients (e.g. Claude Desktop), add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "submissions": {
      "url": "https://mcp-submissions.casper-studios.workers.dev/mcp"
    }
  }
}
```

Once added, you can submit your project directly through your MCP client using the tools provided by the `impact-lab-submissions` MCP server.

**Note:** Only your most recent submission will be reviewed. You can resubmit as many times as you like, but each new submission replaces the previous one.

### Required in Your Repo's README

Every project repo must include a README with the following:

- **Team name**
- **Team members** (names and roles)
- **Problem statement** -- what civic problem are you solving?
- **What it does** -- a short paragraph describing the application
- **Data sources used** -- which city datasets or resources your project uses
- **Architecture / approach** -- brief description (or diagram) of how the pieces fit together
- **Links** -- URL to the live application, if deployed
- **Demo video** -- a 60-second walkthrough of the application. Optional if your app is deployed and accessible via a public link; **required** if it is not.

---

## Rules

- **No early starts.** Your first commit must be after 10:30 AM on 3/7. Projects with evidence of development before that time will be disqualified.
- **Original work only.** Third-party libraries and frameworks are fine, but the core project must be built during the hackathon. No pre-existing projects.
- **One submission per team.** Each team submits one project via the MCP submission server.
- **Use city data responsibly.** Use public APIs and open data. Do not scrape or abuse city systems.
- **Code must be in a public GitHub repo.** Judges need to be able to review your code. You're free to make the repo private after the hackathon closes.

---

## Judging Criteria

Each project will be scored across four categories on a **1-5 scale** (1 = minimal, 5 = exceptional), for a **maximum of 20 points**.

---

### 1. Civic Impact (1-5)

Does this solve a real problem for San Diego residents, city staff, or the community?

Judges should ask: **Would someone actually use this?**

| Score | Description |
|-------|-------------|
| 5 | Addresses a clear, pressing civic need with a compelling use case |
| 4 | Solves a real problem with a well-defined audience |
| 3 | Useful concept, but the target user or problem could be sharper |
| 2 | Loosely connected to a civic use case |
| 1 | No clear civic relevance |

> **Bonus consideration:** Solutions that enable broader access -- such as MCP servers, CLIs, or agentic tools that others can build on -- should be rewarded.

---

### 2. Use of City Data (1-5)

How effectively does the project leverage San Diego's open data, municipal code, council records, or other city resources?

| Score | Description |
|-------|-------------|
| 5 | Deeply integrates multiple city data sources in a meaningful way |
| 4 | Strong use of at least one city data source with clear value |
| 3 | Uses city data, but doesn't go beyond surface-level access |
| 2 | Minimal or superficial use of city data |
| 1 | No meaningful use of city data |

> **Bonus consideration:** Projects that creatively combine datasets (e.g., joining permit data with zoning codes, enriching 311 data with budget info) should be rewarded.

---

### 3. Technical Execution (1-5)

Does it work? Is the demo functional and reasonably polished for a hackathon timeframe?

| Score | Description |
|-------|-------------|
| 5 | Fully functional, polished, and well-scoped for the time available |
| 4 | Working demo with minor rough edges |
| 3 | Core functionality works but notable gaps or bugs |
| 2 | Partially working; significant issues during demo |
| 1 | Non-functional or unable to demo |

> A focused, working MVP beats an ambitious idea that crashes during the demo. Judges should reward smart scoping.

---

### 4. Presentation & Story (1-5)

Did the team clearly communicate what they built, why it matters, and who it's for?

| Score | Description |
|-------|-------------|
| 5 | Compelling narrative, clear demo, and strong delivery |
| 4 | Well-structured presentation with a clear problem/solution arc |
| 3 | Adequate presentation but missing clarity on problem, audience, or impact |
| 2 | Disorganized or hard to follow |
| 1 | No clear communication of the project's purpose |

> A strong demo tells a story: here's the problem, here's how we solve it, here's what it looks like in action.

---

### Scoring Summary

| Category | Max Score |
|----------|-----------|
| Civic Impact | 5 |
| Use of City Data | 5 |
| Technical Execution | 5 |
| Presentation & Story | 5 |
| **Total** | **20** |

---

## Inspiration

Looking for project ideas? Here are some starting points:

1. **Claude Connector for City Data** — Build a Claude-powered connector that enables easier access to San Diego's open data, letting users ask natural-language questions about city datasets (permits, budgets, traffic, etc.) and get structured answers.

2. **MCP Server or CLI for City Data Querying** — Create an MCP server or command-line tool that wraps the Socrata/SODA API, making it easy to query, filter, and join San Diego open datasets without writing raw API calls.

3. **Council Meeting Sentiment Analyzer** — Transcribe council meeting videos (via Whisper or similar) and use Claude to analyze how individual council members feel about specific issues, tracking positions over time.

4. **Municipal Code Assistant** — A conversational tool that helps residents and developers navigate the San Diego Municipal Code — ask questions in plain English and get back relevant code sections with explanations.

5. **Permit Navigator** — An interactive guide that walks users through the building permit process step by step, determining which permits they need based on their project description and surfacing relevant code requirements.

6. **Neighborhood Issue Tracker** — Combine 311 data, code enforcement records, and police call data from the Open Data Portal to visualize and track quality-of-life issues by neighborhood over time.

7. **Budget Explorer** — An interactive visualization of the City of San Diego's budget data that lets residents explore where money goes, compare departments, and track spending trends across fiscal years.

8. **Public Records Request Assistant** — A tool that searches the 40,000+ records in NextRequest, helps users find existing requests related to their topic, and assists in drafting new records requests.

9. **Council Agenda Summarizer** — Automatically pull upcoming council and committee agendas, summarize each item in plain language, and highlight items relevant to a user's neighborhood or interests.

10. **Development Project Impact Analyzer** — Combine permit data, zoning codes, and council records to help residents understand proposed development projects in their area and their potential impact.

11. **Historical Document Search** — Build a semantic search layer over the city's digital archives, making historical documents, photos, and audio files discoverable through natural-language queries.

12. **Code Compliance Checker** — Given a property address or project description, cross-reference the building code, local amendments, and zoning regulations to flag potential compliance issues before a permit application.

13. **Council Voting Pattern Dashboard** — Aggregate council voting records from meeting minutes and results to visualize voting patterns, alliances, and how representatives align on key policy areas.
