import json
import hashlib
import secrets
import frappe
from frappe import _
from frappe.utils import cint, flt


def parse_json(value, default=None):
    if value in (None, ""):
        return default if default is not None else []
    if isinstance(value, (dict, list)):
        return value
    return json.loads(value)


def get_settings():
    return frappe.get_single("Neotec POS Settings")


def make_token(nbytes=24):
    return secrets.token_hex(nbytes)


def hash_secret(secret: str) -> str:
    return hashlib.sha256((secret or "").encode()).hexdigest()


def get_bearer_token():
    auth = frappe.get_request_header("Authorization") or ""
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def require_device():
    token = get_bearer_token()
    if not token:
        frappe.throw(_("Missing bearer token"), frappe.AuthenticationError)
    device_name = frappe.db.get_value("Neotec POS Device", {"access_token": token, "enabled": 1}, "name")
    if not device_name:
        frappe.throw(_("Invalid or disabled token"), frappe.AuthenticationError)
    return frappe.get_doc("Neotec POS Device", device_name)


def make_payload_hash(payload) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def scrub_none(d):
    return {k: v for k, v in (d or {}).items() if v is not None}
