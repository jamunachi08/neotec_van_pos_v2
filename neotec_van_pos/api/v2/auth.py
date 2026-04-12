import frappe
from frappe import _
from neotec_van_pos.utils import make_token, hash_secret, scrub_none


@frappe.whitelist(allow_guest=False)
def issue_device_credentials(device_name: str):
    device = frappe.get_doc("Neotec POS Device", device_name)
    api_key = make_token(12)
    api_secret = make_token(18)
    access_token = make_token(24)
    device.api_key = api_key
    device.api_secret_hash = hash_secret(api_secret)
    device.access_token = access_token
    device.save(ignore_permissions=True)
    return {
        "device": device.name,
        "api_key": api_key,
        "api_secret": api_secret,
        "access_token": access_token,
    }


@frappe.whitelist(allow_guest=True)
def login_device(api_key: str = None, api_secret: str = None):
    if not api_key or not api_secret:
        frappe.throw(_("api_key and api_secret are required"), frappe.AuthenticationError)
    device_name = frappe.db.get_value("Neotec POS Device", {"api_key": api_key, "enabled": 1}, "name")
    if not device_name:
        frappe.throw(_("Invalid device credentials"), frappe.AuthenticationError)
    device = frappe.get_doc("Neotec POS Device", device_name)
    if device.api_secret_hash != hash_secret(api_secret):
        frappe.throw(_("Invalid device credentials"), frappe.AuthenticationError)
    if not device.access_token:
        device.access_token = make_token(24)
        device.save(ignore_permissions=True)
    return scrub_none({
        "status": "ok",
        "device": device.name,
        "access_token": device.access_token,
        "company": device.company,
        "pos_profile": device.pos_profile,
        "warehouse": device.warehouse,
    })
