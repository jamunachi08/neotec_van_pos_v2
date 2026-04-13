import frappe

_ALLOWED_KEYS = [
    "app_title",
    "app_subtitle",
    "terminal_code",
    "device_code",
    "theme_key",
    "editable_mode",
    "default_customer",
    "enable_barcode_scan",
    "enable_offline_badge",
]


@frappe.whitelist()
def get_ui_settings():
    doc = frappe.get_single("Neotec POS UI Settings")
    return {key: doc.get(key) for key in _ALLOWED_KEYS}


@frappe.whitelist()
def save_ui_settings(payload: str | None = None):
    if not frappe.has_permission("Neotec POS UI Settings", "write"):
        frappe.throw("Not permitted", frappe.PermissionError)

    data = frappe.parse_json(payload) if payload else {}
    doc = frappe.get_single("Neotec POS UI Settings")
    for key in _ALLOWED_KEYS:
        if key in data:
            doc.set(key, data[key])
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": "Settings saved"}
