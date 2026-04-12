# Neotec API v2

## Authentication
### Login device
`/api/method/neotec_van_pos.api.v2.auth.login_device`

Payload:
```json
{
  "api_key": "...",
  "api_secret": "..."
}
```

Response:
```json
{
  "status": "ok",
  "device": "NPD-0001",
  "access_token": "...",
  "company": "Neotec Trading",
  "pos_profile": "Main POS",
  "warehouse": "Stores - NT"
}
```

Pass the returned token as:
`Authorization: Bearer <access_token>`

## Catalog
### Get items
`/api/method/neotec_van_pos.api.v2.catalog.get_items`

## Customers
### List customers
`/api/method/neotec_van_pos.api.v2.customer.list_customers`

### Create customer
`/api/method/neotec_van_pos.api.v2.customer.create_customer`

## Shift
### Open shift
`/api/method/neotec_van_pos.api.v2.shift.open_shift`

### Close shift
`/api/method/neotec_van_pos.api.v2.shift.close_shift`

## Sync
### Submit single invoice
`/api/method/neotec_van_pos.api.v2.sync.submit_invoice`

### Push batch
`/api/method/neotec_van_pos.api.v2.sync.push_batch`

### Get sync status
`/api/method/neotec_van_pos.api.v2.sync.get_sync_status`

## Idempotency rules
- First key: `offline_invoice_number`
- Fallback key: `unique_id`
- A successful replay returns the same ERPNext Sales Invoice instead of creating duplicates.

## Legacy compatibility
Older clients can continue calling the original wrapper methods under `neotec_van_pos.api.*` until mobile code is upgraded.
