# Google Analytics Automated Administration (`gaaa`)

CLI tool to programmatically administer GA4 properties and manage custom channel groups.

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Install globally: `npm link`

Now you can use the `gaaa` command from anywhere!

## Usage

### Show help
```bash
gaaa --help
```

### Use CLI to target a specific property
```bash
gaaa --property properties/123456789
```

### Short flag works too
```bash
gaaa -p properties/123456789
```

### Optional: override the group name
```bash
gaaa -p properties/123456789 -g "Custom Channel Group"
```

### Fall back to env var if GA4_PROPERTY_ID is set
```bash
export GA4_PROPERTY_ID="properties/123456789"
gaaa
```

### Show version
```bash
gaaa --version
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
