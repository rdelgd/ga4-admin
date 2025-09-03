# Development Guide

This file provides development guidance and documentation for working with code in this repository.

## Project Overview

This is a Node.js tool for programmatically administering Google Analytics 4 (GA4) properties. The tool specifically manages custom channel groups by adding predefined AI traffic source channels to existing channel groups.

## Key Development Commands

### Running the Application
```bash
# Run with property ID via CLI flag
node index.mjs --property=properties/123456789

# Short flag version
node index.mjs -p properties/123456789

# Override default channel group name
node index.mjs -p properties/123456789 -g "Custom Channel Group"

# Use environment variable (requires GA4_PROPERTY_ID in .env)
node index.mjs
```

### Setup and Dependencies
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Testing
Currently no test suite is configured (package.json shows placeholder test command).

## Code Architecture

### Single-File Architecture
This is a simple, single-file Node.js application (`index.mjs`) with no complex module structure. The architecture follows a straightforward procedural approach:

1. **CLI Argument Parsing**: Custom lightweight flag parser (no external CLI library dependency)
2. **Configuration Management**: Combines CLI flags with environment variables, with CLI taking precedence
3. **Google Analytics Integration**: Uses `@google-analytics/admin` v1alpha API with Google Auth Library
4. **Channel Management Logic**: Defines predefined AI channel specifications and manages their addition to existing channel groups

### Key Components

- **CHANNEL_SPECS**: Array of predefined AI traffic sources (ChatGPT, Perplexity, Gemini, Copilot, Claude, Meta)
- **Authentication**: Uses Google Auth Library with service account credentials
- **Channel Group Operations**: Finds non-system-defined channel groups and appends missing AI channels
- **Rule Building**: Converts channel specifications to GA4 API grouping rules format

### Data Flow
1. Parse CLI arguments and validate property ID
2. Authenticate with Google Analytics Admin API
3. Find target channel group by display name
4. Compare existing rules with predefined channel specs
5. Add only missing channels to avoid duplicates
6. Update channel group via API

## Environment Configuration

### Required Environment Variables
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud service account JSON key file
- `GA4_PROPERTY_ID`: GA4 property ID in format "properties/XXXXXXXXX" (can be overridden via CLI)

### Google Cloud Setup Requirements
- Google Cloud project with Analytics Admin API enabled
- Service account with "Google Analytics Admin" role
- Service account email added to GA4 property with Editor permissions
- Downloaded service account JSON key file

## Important Implementation Details

### CLI Flag Handling
The tool implements a custom CLI parser that supports both long and short flags:
- `--property` / `-p`: GA4 property ID
- `--group` / `-g`: Channel group display name

### Channel Group Targeting
- Only operates on non-system-defined channel groups
- Matches channel groups by display name (case-insensitive)
- Default target group name: "Custom Channel Group"

### API Field Mapping
- UI field name "source" maps to API field "eachScopeSource"
- Match type "CONTAINS" maps to API enum value 4
- All channels use case-insensitive string matching

### Error Handling
- Validates property ID format (must start with "properties/")
- Provides detailed error messages for missing configuration
- Includes API response debugging for REST fallback scenarios
