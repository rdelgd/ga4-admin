# Google Analytics Administration, Analysis and Reporting (`gaaar`)

CLI tool to programmatically administer GA4 properties, run custom reports, and analyze BigQuery data with an "everything-as-code" approach.

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Install globally: `npm link`

Now you can use the `gaaar` command from anywhere!

## Commands

### Channel Management (GA4 Administration example/demo)

Add AI-related traffic sources to your GA4 custom channel groups. This command is intended as a reference/demo example that can be modified or extended. 

```bash
# Show help for channels command
gaaar channels --help

# Target a specific property
gaaar channels --property properties/123456789

# Use short flag
gaaar channels -p properties/123456789

# Override the channel group name
gaaar channels -p properties/123456789 -g "Custom Channel Group"

# Use environment variable
export GA4_PROPERTY_ID="properties/123456789"
gaaar channels
```

This command automatically creates channels for:
- ChatGPT - AI
- Perplexity - AI  
- Gemini - AI
- Copilot.microsoft - AI
- Claude - AI
- Meta - AI

The tool will only add channels that don't already exist in your target channel group.

### Reports

Run GA4 Data API reports from JSON specifications for repeatable, version-controlled reporting.

```bash
# Show help for reports command
gaaar reports --help

# Run a report from a spec file
gaaar reports --spec specs/weekly_kpis.json

# Specify property (overrides spec and env var)
gaaar reports -s specs/weekly_kpis.json -p properties/123456789

# Output formats: table (default), csv, json, ndjson
gaaar reports -s specs/weekly_kpis.json -f csv

# Save output to file
gaaar reports -s specs/weekly_kpis.json -f csv -o reports/weekly_kpis.csv
```

#### Report Types

**Standard Reports** - Regular GA4 reports with dimensions and metrics
```json
{
  "reportType": "standard",
  "dimensions": ["sessionDefaultChannelGroup", "source"],
  "metrics": ["sessions", "totalUsers", "conversions"],
  "dateRanges": [{ "startDate": "7daysAgo", "endDate": "yesterday" }],
  "orderBys": [{ "metric": { "metricName": "sessions" }, "desc": true }],
  "limit": 100000
}
```

**Pivot Reports** - Cross-tabulated data with pivot tables
```json
{
  "reportType": "pivot",
  "dimensions": ["sessionDefaultChannelGroup", "deviceCategory"],
  "metrics": ["sessions"],
  "pivots": [
    { "fieldNames": ["sessionDefaultChannelGroup"], "limit": 25 }
  ]
}
```

**Realtime Reports** - Live data from the last 30 minutes
```json
{
  "reportType": "realtime",
  "dimensions": ["country", "deviceCategory"],
  "metrics": ["activeUsers"]
}
```

See the `specs/` directory for more examples.

### BigQuery Analysis

Run SQL queries against your GA4 BigQuery export data with advanced templating and parameterization.

```bash
# Show help for bq command
gaaar bq --help

# Run a SQL file against GA4 export
gaaar bq --project my-project --dataset ga4_export --sql sql/ai_sources_daily.sql

# Use inline SQL query
gaaar bq --project my-project --dataset ga4_export --query "SELECT event_date, COUNT(*) as events FROM \`{{project}}.{{dataset}}.events_*\` WHERE _TABLE_SUFFIX BETWEEN '20240901' AND '20240930' GROUP BY event_date ORDER BY event_date"

# Add date range parameters (automatically creates @from_sfx and @to_sfx params)
gaaar bq --project my-project --dataset ga4_export --sql sql/ai_sources_daily.sql --from 2024-09-01 --to 2024-09-30

# Add custom named parameters
gaaar bq --project my-project --dataset ga4_export --sql sql/ai_sources_daily.sql --param needle="chatgpt" --param country="US"

# Save results to a BigQuery table
gaaar bq --project my-project --dataset ga4_export --sql sql/ai_sources_daily.sql --dest ai_traffic_daily

# Overwrite existing table
gaaar bq --project my-project --dataset ga4_export --sql sql/ai_sources_daily.sql --dest ai_traffic_daily --write truncate

# Dry run to estimate query cost
gaaar bq --project my-project --dataset ga4_export --sql sql/ai_sources_daily.sql --dry-run
```

#### SQL Template Features

**Project & Dataset Substitution** - Use `{{project}}` and `{{dataset}}` placeholders in your SQL:
```sql
FROM `{{project}}.{{dataset}}.events_*`
```

**Named Parameters** - Use `@parameter_name` in SQL with `--param` flags:
```sql
WHERE _TABLE_SUFFIX BETWEEN @from_sfx AND @to_sfx
  AND LOWER(source) LIKE CONCAT('%', LOWER(@needle), '%')
```

**Date Range Automation** - `--from` and `--to` flags automatically create suffix parameters:
- `--from 2024-09-01 --to 2024-09-30` creates `@from_sfx="20240901"` and `@to_sfx="20240930"`

**Table Management Options**:
- `--write append` (default) - Add rows to existing table
- `--write truncate` - Replace all table data
- `--create ifneeded` (default) - Create table if it doesn't exist
- `--create never` - Fail if table doesn't exist

### Global Options

```bash
# Show version
gaaar --version

# Show help
gaaar --help
```

## Requirements

- Node.js
- Google Analytics Admin API 
- Google Analytics Data API 
- Google BigQuery API  
- A GA4 property with a custom channel group

**Important:** See the `.env.example` file for detailed instructions on how to set up the required Google Cloud Platform (GCP) configurations, including service account setup, API enablement, and authentication credentials.
