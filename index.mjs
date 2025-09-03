#!/usr/bin/env node

// index.mjs
import { GoogleAuth } from "google-auth-library";
import { v1alpha } from "@google-analytics/admin";
import { Command } from "commander";
import "dotenv/config";

const program = new Command();

program
  .name("gaaa")
  .description("GA4 Admin - Manage GA4 custom channel groups")
  .version("1.0.0")
  .option(
    "-p, --property <propertyId>",
    "GA4 property ID (e.g., properties/123456789)"
  )
  .option(
    "-g, --group <groupName>",
    "Target channel group name",
    "Custom Channel Group"
  )
  .action(async (options) => {
    const PROPERTY_ID = options.property || process.env.GA4_PROPERTY_ID;
    const TARGET_GROUP_DISPLAY_NAME = (
      options.group || "Custom Channel Group"
    ).trim();

    if (!PROPERTY_ID) {
      console.error(
        "Missing GA4 property id. Use --property=properties/123456789 or set GA4_PROPERTY_ID."
      );
      process.exit(1);
    }
    if (!PROPERTY_ID.startsWith("properties/")) {
      console.error(
        "GA4 property id must look like 'properties/123456789'. Got:",
        PROPERTY_ID
      );
      process.exit(1);
    }

    try {
      await appendAiChannels(PROPERTY_ID, TARGET_GROUP_DISPLAY_NAME);
    } catch (err) {
      console.error("Error:", err?.message || err);
      // Print more details if using REST fallback
      if (err?.response?.data) {
        console.error(
          "Response data:",
          JSON.stringify(err.response.data, null, 2)
        );
      }
      process.exit(1);
    }
  });

// ---- Channel specs (extend as needed) ----
const CHANNEL_SPECS = [
  {
    displayName: "ChatGPT - AI",
    fieldName: "source",
    matchType: "CONTAINS",
    value: "chatgpt",
  },
  {
    displayName: "Perplexity - AI",
    fieldName: "source",
    matchType: "CONTAINS",
    value: "perplexity",
  },
  {
    displayName: "Gemini - AI",
    fieldName: "source",
    matchType: "CONTAINS",
    value: "gemini",
  },
  {
    displayName: "Copilot.microsoft - AI",
    fieldName: "source",
    matchType: "CONTAINS",
    value: "copilot.microsoft",
  },
  {
    displayName: "Claude - AI",
    fieldName: "source",
    matchType: "CONTAINS",
    value: "claude",
  },
  {
    displayName: "Meta - AI",
    fieldName: "source",
    matchType: "CONTAINS",
    value: "meta",
  },
];

// ---- Auth & client ----
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/analytics.edit"],
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // optional if using ADC
});
const client = new v1alpha.AnalyticsAdminServiceClient({
  auth,
  fallback: true,
});

// Build a "source CONTAINS value" rule (shape that worked for you)
function buildGroupingRule({ displayName, fieldName, matchType, value }) {
  // Map UI field to API field (your working mapping)
  const apiFieldName = fieldName === "source" ? "eachScopeSource" : fieldName;

  // Map match type string to enum number (your working mapping)
  const apiMatchType = matchType === "CONTAINS" ? 4 : 1; // CONTAINS=4, EXACT=1

  return {
    displayName,
    expression: {
      andGroup: {
        filterExpressions: [
          {
            orGroup: {
              filterExpressions: [
                {
                  filter: {
                    fieldName: apiFieldName,
                    stringFilter: {
                      matchType: apiMatchType,
                      value,
                      caseSensitive: false,
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  };
}

async function findTargetChannelGroup(propertyId, targetGroupDisplayName) {
  const [groups] = await client.listChannelGroups({ parent: propertyId });
  return groups.find(
    (g) =>
      !g.systemDefined &&
      (g.displayName || "").toLowerCase() ===
        targetGroupDisplayName.toLowerCase()
  );
}

function hasRuleByDisplayName(rules = [], name) {
  const needle = (name || "").toLowerCase();
  return rules.some((r) => (r.displayName || "").toLowerCase() === needle);
}

async function appendAiChannels(propertyId, targetGroupDisplayName) {
  console.log(
    `\n→ Property: ${propertyId}\n→ Channel Group: "${targetGroupDisplayName}"\n`
  );

  const target = await findTargetChannelGroup(
    propertyId,
    targetGroupDisplayName
  );
  if (!target) {
    throw new Error(
      `Channel Group "${targetGroupDisplayName}" not found (or it's system-defined) on ${propertyId}.`
    );
  }

  const currentRules = target.groupingRule || [];
  const toAdd = CHANNEL_SPECS.filter(
    (spec) => !hasRuleByDisplayName(currentRules, spec.displayName)
  ).map(buildGroupingRule);

  if (toAdd.length === 0) {
    console.log(
      `No changes: all specified channels already exist in "${target.displayName}".`
    );
    return;
  }

  const mergedRules = [...currentRules, ...toAdd];

  const [resp] = await client.updateChannelGroup({
    channelGroup: { name: target.name, groupingRule: mergedRules },
    updateMask: { paths: ["grouping_rule"] },
  });

  console.log(`Updated "${resp.displayName}" (${resp.name}). Added channels:`);
  toAdd.forEach((r) => console.log(`- ${r.displayName}`));
}

// Parse command line arguments
program.parse();
