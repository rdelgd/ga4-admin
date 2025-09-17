# Google Analytics Administration, Analysis and Reporting (`gaaar`)

CLI tool to programmatically administer GA4 properties and run custom reports with an "everything-as-code" approach.

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Install globally: `npm link`

Now you can use the `gaaar` command from anywhere!

## Commands

### Channel Management

Add AI-related traffic sources to your GA4 custom channel groups.

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
