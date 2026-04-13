import frappe
from neotec_van_pos.api.v2.catalog import get_items as v2_get_items
from neotec_van_pos.api.v2.customer import list_customers as v2_customer_list, create_customer as v2_create_customer
from neotec_van_pos.api.v2.shift import open_shift as v2_open_shift, close_shift as v2_close_shift
from neotec_van_pos.api.v2.sync import submit_invoice as v2_submit_invoice


@frappe.whitelist(allow_guest=False)
def health_check():
    return {"status": "ok", "app": "neotec_van_pos", "version": "2.0.0"}


@frappe.whitelist(allow_guest=False)
def get_items(**kwargs):
    return v2_get_items(**kwargs)


@frappe.whitelist(allow_guest=False)
def customer_list(**kwargs):
    return v2_customer_list(**kwargs)


@frappe.whitelist(allow_guest=False)
def create_customer_new(**kwargs):
    return v2_create_customer(**kwargs)


@frappe.whitelist(allow_guest=False)
def opening_shift(**kwargs):
    return v2_open_shift(**kwargs)


@frappe.whitelist(allow_guest=False)
def closing_shift(**kwargs):
    return v2_close_shift(**kwargs)


@frappe.whitelist(allow_guest=False)
def create_invoice(**kwargs):
    return v2_submit_invoice(**kwargs)
