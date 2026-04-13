import frappe
from frappe import _
from frappe.utils import flt, cint, now_datetime
from frappe.utils.file_manager import save_file
from neotec_van_pos.utils import parse_json, get_settings, require_device, make_payload_hash


def _upsert_sync_log(device, sync_type, offline_id, payload):
    payload_hash = make_payload_hash(payload)
    existing_name = frappe.db.get_value(
        "Neotec POS Sync Log",
        {"device": device.name, "sync_type": sync_type, "offline_id": offline_id},
        "name",
    )
    if existing_name:
        doc = frappe.get_doc("Neotec POS Sync Log", existing_name)
        if doc.payload_hash == payload_hash and doc.status == "Success":
            return doc, True
        doc.payload_json = frappe.as_json(payload)
        doc.payload_hash = payload_hash
        doc.status = "Pending"
        doc.error_message = None
        doc.last_seen_on = now_datetime()
        doc.save(ignore_permissions=True)
        return doc, False

    doc = frappe.get_doc({
        "doctype": "Neotec POS Sync Log",
        "device": device.name,
        "sync_type": sync_type,
        "offline_id": offline_id,
        "payload_json": frappe.as_json(payload),
        "payload_hash": payload_hash,
        "status": "Pending",
        "last_seen_on": now_datetime(),
    })
    doc.insert(ignore_permissions=True)
    return doc, False


def _mark_success(log_doc, reference_doctype=None, reference_name=None, response=None):
    log_doc.status = "Success"
    log_doc.reference_doctype = reference_doctype
    log_doc.reference_name = reference_name
    log_doc.response_json = frappe.as_json(response or {})
    log_doc.error_message = None
    log_doc.save(ignore_permissions=True)


def _mark_failure(log_doc, exc):
    log_doc.status = "Failed"
    log_doc.error_message = str(exc)
    log_doc.save(ignore_permissions=True)


def _find_existing_invoice(device, offline_invoice_number, unique_id):
    if frappe.db.has_column("Sales Invoice", "custom_neotec_offline_invoice_number") and offline_invoice_number:
        name = frappe.db.get_value("Sales Invoice", {"custom_neotec_offline_invoice_number": offline_invoice_number}, "name")
        if name:
            return frappe.get_doc("Sales Invoice", name)
    if frappe.db.has_column("Sales Invoice", "custom_neotec_unique_id") and unique_id:
        name = frappe.db.get_value("Sales Invoice", {"custom_neotec_unique_id": unique_id}, "name")
        if name:
            return frappe.get_doc("Sales Invoice", name)
    return None


@frappe.whitelist(allow_guest=False)
def submit_invoice(**kwargs):
    device = require_device()
    settings = get_settings()
    data = frappe._dict(kwargs or frappe.form_dict)
    items = parse_json(data.get("items"), [])
    payments = parse_json(data.get("payments"), [])

    if not items:
        frappe.throw(_("At least one invoice item is required."))

    offline_invoice_number = data.get("offline_invoice_number") or data.get("invoice_no")
    unique_id = data.get("unique_id") or offline_invoice_number
    payload = dict(data)
    log_doc, replay = _upsert_sync_log(device, "Invoice", offline_invoice_number or unique_id, payload)
    if replay and log_doc.reference_doctype == "Sales Invoice" and log_doc.reference_name:
        si = frappe.get_doc("Sales Invoice", log_doc.reference_name)
        return {"status": "ok", "idempotent": 1, "data": {"id": si.name, "grand_total": si.grand_total}}

    existing = _find_existing_invoice(device, offline_invoice_number, unique_id)
    if existing:
        response = {"status": "ok", "idempotent": 1, "data": {"id": existing.name, "grand_total": existing.grand_total}}
        _mark_success(log_doc, "Sales Invoice", existing.name, response)
        return response

    try:
        si = frappe.new_doc("Sales Invoice")
        si.company = device.company or settings.company
        si.customer = data.get("customer_name") or settings.walk_in_customer
        si.is_pos = 1
        si.pos_profile = device.pos_profile or settings.pos_profile
        if hasattr(si, "set_warehouse"):
            si.set_warehouse = device.warehouse or settings.warehouse
        if hasattr(si, "update_stock"):
            si.update_stock = cint(getattr(settings, "update_stock", 1))
        if frappe.db.has_column("Sales Invoice", "custom_neotec_unique_id"):
            si.custom_neotec_unique_id = unique_id
        if frappe.db.has_column("Sales Invoice", "custom_neotec_offline_invoice_number"):
            si.custom_neotec_offline_invoice_number = offline_invoice_number

        for row in items:
            si.append("items", {
                "item_code": row.get("item_code"),
                "qty": flt(row.get("quantity") or row.get("qty") or 0),
                "rate": flt(row.get("rate") or 0),
                "uom": row.get("uom") or None,
            })

        if hasattr(si, "payments"):
            for pay in payments:
                si.append("payments", {
                    "mode_of_payment": pay.get("mode_of_payment") or pay.get("mode") or "Cash",
                    "amount": flt(pay.get("amount") or 0),
                })

        si.insert(ignore_permissions=True)
        si.submit()

        if data.get("qr_code"):
            save_file(f"{si.name}-qr.png", data.get("qr_code"), "Sales Invoice", si.name, is_private=1)
        if data.get("xml"):
            save_file(f"{si.name}.xml", data.get("xml"), "Sales Invoice", si.name, is_private=1)

        response = {
            "status": "ok",
            "data": {
                "id": si.name,
                "customer_id": si.customer,
                "customer_name": si.customer_name,
                "total": si.total,
                "net_total": si.net_total,
                "grand_total": si.grand_total,
            },
        }
        _mark_success(log_doc, "Sales Invoice", si.name, response)
        return response
    except Exception as exc:
        _mark_failure(log_doc, exc)
        raise


@frappe.whitelist(allow_guest=False)
def push_batch(sync_session: str = None, invoices=None):
    device = require_device()
    payloads = parse_json(invoices, [])
    if not sync_session:
        session_doc = frappe.get_doc({
            "doctype": "Neotec POS Sync Session",
            "device": device.name,
            "status": "In Progress",
            "request_count": len(payloads),
        })
        session_doc.insert(ignore_permissions=True)
        sync_session = session_doc.name
    else:
        session_doc = frappe.get_doc("Neotec POS Sync Session", sync_session)

    results = []
    success_count = 0
    failed_count = 0
    for row in payloads:
        try:
            out = submit_invoice(**row)
            results.append({"offline_id": row.get("offline_invoice_number") or row.get("unique_id"), "status": "Success", "response": out})
            success_count += 1
        except Exception as exc:
            results.append({"offline_id": row.get("offline_invoice_number") or row.get("unique_id"), "status": "Failed", "error": str(exc)})
            failed_count += 1

    session_doc.success_count = success_count
    session_doc.failed_count = failed_count
    session_doc.status = "Completed" if failed_count == 0 else "Completed With Errors"
    session_doc.save(ignore_permissions=True)
    return {"sync_session": session_doc.name, "results": results, "success_count": success_count, "failed_count": failed_count}


@frappe.whitelist(allow_guest=False)
def get_sync_status(sync_session: str):
    require_device()
    doc = frappe.get_doc("Neotec POS Sync Session", sync_session)
    return {
        "name": doc.name,
        "status": doc.status,
        "request_count": doc.request_count,
        "success_count": doc.success_count,
        "failed_count": doc.failed_count,
    }
