import frappe
from frappe import _
from frappe.utils import get_datetime
from neotec_van_pos.utils import get_settings, require_device


@frappe.whitelist(allow_guest=False)
def open_shift(shift_local_id: str = None, opening_balance_json: str = None, period_start_date: str = None):
    device = require_device()
    settings = get_settings()
    if shift_local_id and frappe.db.exists("Neotec POS Shift", {"shift_local_id": shift_local_id}):
        existing = frappe.get_doc("Neotec POS Shift", {"shift_local_id": shift_local_id})
        return {"data": {"sync_id": existing.name, "period_start_date": str(existing.period_start_date), "idempotent": 1}}
    doc = frappe.get_doc({
        "doctype": "Neotec POS Shift",
        "shift_local_id": shift_local_id,
        "device": device.name,
        "company": device.company or settings.company,
        "pos_profile": device.pos_profile or settings.pos_profile,
        "user": device.device_user or frappe.session.user,
        "period_start_date": get_datetime(period_start_date) if period_start_date else get_datetime(),
        "opening_balance_json": opening_balance_json,
        "status": "Open",
    })
    doc.insert(ignore_permissions=True)
    return {"data": {"sync_id": doc.name, "period_start_date": str(doc.period_start_date)}}


@frappe.whitelist(allow_guest=False)
def close_shift(shift_name: str = None, shift_local_id: str = None, period_end_date: str = None, payment_reconciliation_json: str = None, details_json: str = None, created_invoice_status: str = None):
    require_device()
    name = shift_name or frappe.db.get_value("Neotec POS Shift", {"shift_local_id": shift_local_id}, "name")
    if not name:
        frappe.throw(_("Shift not found"))
    doc = frappe.get_doc("Neotec POS Shift", name)
    doc.period_end_date = get_datetime(period_end_date) if period_end_date else get_datetime()
    doc.payment_reconciliation_json = payment_reconciliation_json
    doc.details_json = details_json
    doc.created_invoice_status = created_invoice_status
    doc.status = "Closed"
    doc.save(ignore_permissions=True)
    return {"status": "closed", "name": doc.name}
