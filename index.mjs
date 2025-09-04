#!/usr/bin/env node

// index.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { GoogleAuth } from "google-auth-library";
import { v1alpha } from "@google-analytics/admin";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { Command } from "commander";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();
program
  .name("gaaar")
  .description("GA4 Admin + Data CLI: channel groups & programmatic reports")
  .version("1.1.0");

/* -----------------------------------------------------------------------------
 * Subcommand: channels
 * ---------------------------------------------------------------------------*/
program
  .command("channels")
  .description("Manage GA4 custom channel groups (append AI sources)")
  .requiredOption(
    "-p, --property <propertyId>",
    "GA4 property ID (e.g., properties/123456789)",
    process.env.GA4_PROPERTY_ID
  )
  .option(
    "-g, --group <groupName>",
    "Target channel group display name",
    "Custom Channel Group"
  )
  .action(async (opts) => {
    const PROPERTY_ID = opts.property || process.env.GA4_PROPERTY_ID;
    const TARGET_GROUP_DISPLAY_NAME = (
      opts.group || "Custom Channel Group"
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

// ---- Auth & Admin client (v1alpha) ----
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/analytics.edit"],
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // optional with ADC
});
const adminClient = new v1alpha.AnalyticsAdminServiceClient({
  auth,
  fallback: true,
});

// Build a "source CONTAINS value" rule (shape you validated)
function buildGroupingRule({ displayName, fieldName, matchType, value }) {
  const apiFieldName = fieldName === "source" ? "eachScopeSource" : fieldName;
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
  const [groups] = await adminClient.listChannelGroups({ parent: propertyId });
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

  const [resp] = await adminClient.updateChannelGroup({
    channelGroup: { name: target.name, groupingRule: mergedRules },
    updateMask: { paths: ["grouping_rule"] },
  });

  console.log(`Updated "${resp.displayName}" (${resp.name}). Added channels:`);
  toAdd.forEach((r) => console.log(`- ${r.displayName}`));
}

/* -----------------------------------------------------------------------------
 * Subcommand: reports
 * ---------------------------------------------------------------------------*/
program
  .command("reports")
  .description("Run GA4 Data API reports from a JSON spec (everything-as-code)")
  .requiredOption("-s, --spec <path>", "Path to report spec JSON")
  .option(
    "-p, --property <propertyId>",
    "GA4 property (e.g., properties/123456789)",
    process.env.GA4_PROPERTY_ID
  )
  .option("-f, --format <fmt>", "csv|json|ndjson|table", "table")
  .option("-o, --out <path>", "Write output to file instead of stdout")
  .action(async (opts) => {
    const SPEC_PATH = path.resolve(opts.spec);
    if (!fs.existsSync(SPEC_PATH)) {
      console.error("Spec file not found:", SPEC_PATH);
      process.exit(1);
    }
    const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
    const PROPERTY =
      opts.property || spec.property || process.env.GA4_PROPERTY_ID;

    if (!PROPERTY || !PROPERTY.startsWith("properties/")) {
      console.error(
        "Missing/invalid GA4 property. Use -p properties/123456789 or set GA4_PROPERTY_ID or put `property` in the spec."
      );
      process.exit(1);
    }

    const FORMAT = (opts.format || "table").toLowerCase();
    const OUT_PATH = opts.out ? path.resolve(opts.out) : null;

    try {
      await runReportFromSpec({
        spec,
        property: PROPERTY,
        format: FORMAT,
        outPath: OUT_PATH,
      });
    } catch (err) {
      console.error("\nError:", err?.message || err);
      if (err?.response?.data) {
        console.error(
          "Response data:",
          JSON.stringify(err.response.data, null, 2)
        );
      }
      process.exit(1);
    }
  });

// ─── Data API helpers ─────────────────────────────────────────────────────────
const dataClient = new BetaAnalyticsDataClient();

const toDimObjs = (dims = []) =>
  dims.map((d) => (typeof d === "string" ? { name: d } : d));
const toMetObjs = (mets = []) =>
  mets.map((m) => (typeof m === "string" ? { name: m } : m));

function buildRunReportRequest(property, s) {
  return {
    property,
    dateRanges: s.dateRanges || [
      { startDate: "7daysAgo", endDate: "yesterday" },
    ],
    dimensions: toDimObjs(s.dimensions || []),
    metrics: toMetObjs(s.metrics || []),
    dimensionFilter: s.dimensionFilter,
    metricFilter: s.metricFilter,
    orderBys: s.orderBys,
    keepEmptyRows: !!s.keepEmptyRows,
    limit: s.limit ?? 100000,
    offset: s.offset ?? 0,
    returnPropertyQuota: s.returnPropertyQuota ?? true,
  };
}

function buildRunPivotReportRequest(property, s) {
  return {
    property,
    dateRanges: s.dateRanges || [
      { startDate: "7daysAgo", endDate: "yesterday" },
    ],
    dimensions: toDimObjs(s.dimensions || []),
    metrics: toMetObjs(s.metrics || []),
    pivots: s.pivots || [],
    dimensionFilter: s.dimensionFilter,
    metricFilter: s.metricFilter,
    keepEmptyRows: !!s.keepEmptyRows,
    returnPropertyQuota: s.returnPropertyQuota ?? true,
  };
}

function buildRunRealtimeRequest(property, s) {
  return {
    property,
    dimensions: toDimObjs(s.dimensions || []),
    metrics: toMetObjs(s.metrics || [{ name: "activeUsers" }]),
    minuteRanges: s.minuteRanges,
  };
}

function toCsv(dimHeaders, metHeaders, rows) {
  const dimNames = dimHeaders.map((h) => h.name);
  const metNames = metHeaders.map((h) => h.name);
  const header = [...dimNames, ...metNames].join(",");
  const lines = rows.map((r) => {
    const dims = (r.dimensionValues || []).map((v) => csvEscape(v.value ?? ""));
    const mets = (r.metricValues || []).map((v) => csvEscape(v.value ?? ""));
    return [...dims, ...mets].join(",");
  });
  return [header, ...lines].join("\n");
}
function csvEscape(s) {
  if (s == null) return "";
  const needs = /[",\n]/.test(s);
  return needs ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeOut(content, outPath) {
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content, "utf8");
    console.log(`\nWrote output → ${outPath}`);
  } else {
    console.log(content);
  }
}
function tablePrint(dimHeaders, metHeaders, rows, maxRows = 50) {
  const dimNames = dimHeaders.map((h) => h.name);
  const metNames = metHeaders.map((h) => h.name);
  const cols = [...dimNames, ...metNames];

  const slice = rows
    .slice(0, maxRows)
    .map((r) => [
      ...(r.dimensionValues || []).map((v) => v.value ?? ""),
      ...(r.metricValues || []).map((v) => v.value ?? ""),
    ]);

  const widths = cols.map((c, i) =>
    Math.max(c.length, ...slice.map((row) => String(row[i] ?? "").length), 6)
  );
  const pad = (str, n) => String(str ?? "").padEnd(n, " ");
  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";

  console.log(sep);
  console.log(
    "|" + cols.map((c, i) => " " + pad(c, widths[i]) + " ").join("|") + "|"
  );
  console.log(sep);
  for (const r of slice) {
    console.log(
      "|" + r.map((v, i) => " " + pad(v, widths[i]) + " ").join("|") + "|"
    );
  }
  console.log(sep);
  if (rows.length > maxRows)
    console.log(`(showing ${maxRows} of ${rows.length} rows)`);
}

async function runReportFromSpec({ spec, property, format, outPath }) {
  const type = (spec.reportType || "standard").toLowerCase();

  if (type === "standard") {
    const req = buildRunReportRequest(property, spec);
    // paginate using limit/offset
    let rows = [];
    let dimHeaders = [];
    let metHeaders = [];
    let fetched = 0;
    let more = true;
    while (more) {
      const [resp] = await dataClient.runReport({
        ...req,
        offset: req.offset + fetched,
      });
      dimHeaders = resp.dimensionHeaders || dimHeaders;
      metHeaders = resp.metricHeaders || metHeaders;
      const batch = resp.rows || [];
      rows = rows.concat(batch);
      const total = Number(resp.rowCount ?? rows.length);
      fetched += batch.length;
      more = fetched < total && batch.length > 0;
    }

    if (format === "csv") {
      writeOut(toCsv(dimHeaders, metHeaders, rows), outPath);
    } else if (format === "json") {
      writeOut(
        JSON.stringify(
          { dimensionHeaders: dimHeaders, metricHeaders: metHeaders, rows },
          null,
          2
        ),
        outPath
      );
    } else if (format === "ndjson") {
      const dimNames = dimHeaders.map((h) => h.name);
      const metNames = metHeaders.map((h) => h.name);
      const lines = rows.map((r) => {
        const obj = {};
        dimNames.forEach(
          (n, i) => (obj[n] = r.dimensionValues?.[i]?.value ?? null)
        );
        metNames.forEach(
          (n, i) => (obj[n] = r.metricValues?.[i]?.value ?? null)
        );
        return JSON.stringify(obj);
      });
      writeOut(lines.join("\n"), outPath);
    } else {
      tablePrint(dimHeaders, metHeaders, rows);
    }
  } else if (type === "pivot") {
    const req = buildRunPivotReportRequest(property, spec);
    const [resp] = await dataClient.runPivotReport(req);
    writeOut(JSON.stringify(resp, null, 2), outPath);
  } else if (type === "realtime") {
    const req = buildRunRealtimeRequest(property, spec);
    const [resp] = await dataClient.runRealtimeReport(req);
    const dimHeaders = resp.dimensionHeaders || [];
    const metHeaders = resp.metricHeaders || [];
    const rows = resp.rows || [];
    if (format === "csv") {
      writeOut(toCsv(dimHeaders, metHeaders, rows), outPath);
    } else if (format === "json") {
      writeOut(JSON.stringify(resp, null, 2), outPath);
    } else if (format === "ndjson") {
      const dimNames = dimHeaders.map((h) => h.name);
      const metNames = metHeaders.map((h) => h.name);
      const lines = rows.map((r) => {
        const obj = {};
        dimNames.forEach(
          (n, i) => (obj[n] = r.dimensionValues?.[i]?.value ?? null)
        );
        metNames.forEach(
          (n, i) => (obj[n] = r.metricValues?.[i]?.value ?? null)
        );
        return JSON.stringify(obj);
      });
      writeOut(lines.join("\n"), outPath);
    } else {
      tablePrint(dimHeaders, metHeaders, rows);
    }
  } else {
    throw new Error(
      `Unknown reportType "${spec.reportType}". Use "standard", "pivot", or "realtime".`
    );
  }
}

/* -----------------------------------------------------------------------------
 * Parse args
 * ---------------------------------------------------------------------------*/
program.parseAsync();
