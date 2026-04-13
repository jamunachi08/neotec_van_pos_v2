# Neotec VAN POS v2

Production-oriented Frappe/ERPNext backend for VAN POS and mobile sync.

## Highlights
- Neotec-branded Frappe app
- API v2 with device auth helpers and replay-safe sync
- Invoice idempotency based on device and offline invoice number
- Sync logging and sync session tracking
- Legacy compatibility wrappers for older mobile clients

## Bench Install
```bash
bench get-app /path/to/neotec_van_pos_v2
bench --site yoursite install-app neotec_van_pos
bench --site yoursite migrate
bench build --app neotec_van_pos
```

## Recommended hardening
- Put the API behind HTTPS only
- Create one `Neotec POS Device` per route/device
- Generate API keys from the Device form or by server script
- Restrict device user roles to POS-related permissions only
- Add a reverse proxy rate limit for `/api/method/neotec_van_pos.api.v2.*`

## Main API families
- `neotec_van_pos.api.v2.auth`
- `neotec_van_pos.api.v2.catalog`
- `neotec_van_pos.api.v2.customer`
- `neotec_van_pos.api.v2.shift`
- `neotec_van_pos.api.v2.sync`

## Legacy wrappers
These wrappers remain available to reduce mobile breaking changes:
- `neotec_van_pos.api.get_items`
- `neotec_van_pos.api.customer_list`
- `neotec_van_pos.api.create_customer_new`
- `neotec_van_pos.api.opening_shift`
- `neotec_van_pos.api.closing_shift`
- `neotec_van_pos.api.create_invoice`


## POS Terminal UI
This package now includes a configurable Desk page at `/app/neotec-pos-terminal`.

Included UI assets:
- React-based POS terminal screen
- editable screen designer modal
- color palette selector
- Single DocType: `Neotec POS UI Settings`
- API methods:
  - `neotec_van_pos.api.ui_settings.get_ui_settings`
  - `neotec_van_pos.api.ui_settings.save_ui_settings`
