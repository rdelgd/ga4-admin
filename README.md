# GA4 Admin 
Node tool to programmatically administer GA4 properties. 

## Use CLI to target a specific property
```bash
node index.mjs --property=properties/123456789
```

## Short flag works too
```bash
node index.mjs -p properties/123456789
```

## Optional: override the group name
```bash
node index.mjs -p properties/123456789 -g "Custom Channel Group"
```

## Fall back to env var (no CLI) if GA4_PROPERTY_ID is set
```bash
GA4_PROPERTY_ID="properties/123456789" node index.mjs
```
