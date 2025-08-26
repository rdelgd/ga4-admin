# GA4 Admin 
Node tool to programmatically administer GA4 properties. 

# Use CLI to target a specific property
node index.mjs --property=properties/123456789

# Short flag works too
node index.mjs -p properties/123456789

# Optional: override the group name
node index.mjs -p properties/123456789 -g "Custom Channel Group"

# Fall back to env var (no CLI) if GA4_PROPERTY_ID is set
GA4_PROPERTY_ID="properties/123456789" node index.mjs
