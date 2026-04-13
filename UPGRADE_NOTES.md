# Upgrade Notes

## Old wrapper mapping
- `gpos.gpos.pos.get_items` -> `neotec_van_pos.api.get_items`
- `gpos.gpos.pos.customer_list` -> `neotec_van_pos.api.customer_list`
- `gpos.gpos.pos.create_customer_new` -> `neotec_van_pos.api.create_customer_new`
- `gpos.gpos.pos_shift.opening_shift` -> `neotec_van_pos.api.opening_shift`
- `gpos.gpos.pos_shift.closing_shift` -> `neotec_van_pos.api.closing_shift`
- `gpos.gpos.pos.create_invoice` -> `neotec_van_pos.api.create_invoice`

## New preferred endpoints
- `neotec_van_pos.api.v2.auth.login_device`
- `neotec_van_pos.api.v2.catalog.get_items`
- `neotec_van_pos.api.v2.customer.list_customers`
- `neotec_van_pos.api.v2.customer.create_customer`
- `neotec_van_pos.api.v2.shift.open_shift`
- `neotec_van_pos.api.v2.shift.close_shift`
- `neotec_van_pos.api.v2.sync.submit_invoice`
- `neotec_van_pos.api.v2.sync.push_batch`
- `neotec_van_pos.api.v2.sync.get_sync_status`
