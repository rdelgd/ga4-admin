# Google Analytics Automated Administration and Reporting (`gaaar`)

CLI tool to programmatically administer GA4 properties and manage custom channel groups.

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Install globally: `npm link`

Now you can use the `gaaar` command from anywhere!

## Usage

### Show help
```bash
gaaar --help
```

### Use CLI to target a specific property
```bash
gaaar --property properties/123456789
```

### Short flag works too
```bash
gaaar -p properties/123456789
```

### Optional: override the group name
```bash
gaaar -p properties/123456789 -g "Custom Channel Group"
```

### Fall back to env var if GA4_PROPERTY_ID is set
```bash
export GA4_PROPERTY_ID="properties/123456789"
gaaar
```

### Show version
```bash
gaaar --version
```

## What it does

This tool adds AI-related traffic sources to your GA4 custom channel groups. It automatically creates channels for:

- ChatGPT - AI
- Perplexity - AI  
- Gemini - AI
- Copilot.microsoft - AI
- Claude - AI
- Meta - AI

The tool will only add channels that don't already exist in your target channel group.

## Requirements

- Node.js
- Google Analytics Admin API credentials
- A GA4 property with a custom channel group

**Important:** See the `.env.example` file for detailed instructions on how to set up the required Google Cloud Platform (GCP) configurations, including service account setup, API enablement, and authentication credentials.
