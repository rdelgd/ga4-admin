// index.mjs
import { GoogleAuth } from "google-auth-library";
// import { AnalyticsAdminServiceClient } from "@google-analytics/admin";
import { v1alpha } from "@google-analytics/admin";
import "dotenv/config";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID; // e.g., "properties/123456789"
const TARGET_GROUP_DISPLAY_NAME = "Custom Channel Group";

if (!PROPERTY_ID) {
  console.error("Missing GA4_PROPERTY_ID (e.g., properties/123456789)");
  process.exit(1);
}

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
// const client = new AnalyticsAdminServiceClient({ auth });
const client = new v1alpha.AnalyticsAdminServiceClient({
  auth,
  fallback: true, // use REST fallback
});

// replace buildGroupingRule with this shape:
function buildGroupingRule({ displayName, fieldName, matchType, value }) {
  // Convert field names to GA4 API expected format
  const apiFieldName = fieldName === "source" ? "eachScopeSource" : fieldName;

  // Convert match type to numeric value (based on the existing rules pattern)
  const apiMatchType = matchType === "CONTAINS" ? 4 : 1; // CONTAINS = 4, EXACT = 1

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
                      value: value,
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

async function findTargetChannelGroup(propertyId) {
  const [groups] = await client.listChannelGroups({ parent: propertyId });
  return groups.find(
    (g) =>
      !g.systemDefined &&
      (g.displayName || "").toLowerCase() ===
        TARGET_GROUP_DISPLAY_NAME.toLowerCase()
  );
}

function hasRuleByDisplayName(rules = [], name) {
  const needle = (name || "").toLowerCase();
  return rules.some((r) => (r.displayName || "").toLowerCase() === needle);
}

async function appendAiChannels(propertyId) {
  const target = await findTargetChannelGroup(propertyId);
  if (!target) {
    throw new Error(
      `Channel Group "${TARGET_GROUP_DISPLAY_NAME}" not found (or it's system-defined).`
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

  // ✅ send the minimal payload (avoid echoing server-populated/immutable fields)
  const [resp] = await client.updateChannelGroup({
    channelGroup: {
      name: target.name, // e.g., "properties/123/channelGroups/456"
      groupingRule: mergedRules, // merged rules only
    },
    updateMask: { paths: ["grouping_rule"] },
  });

  console.log(`Updated "${resp.displayName}" (${resp.name}). Added channels:`);
  toAdd.forEach((r) => console.log(`- ${r.displayName}`));
}

// ---- Run ----
(async () => {
  try {
    await appendAiChannels(PROPERTY_ID);
  } catch (err) {
    console.error("Error:", err?.message || err);
    process.exit(1);
  }
})();
