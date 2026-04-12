import frappe
from frappe import _
from frappe.utils import cint
from neotec_van_pos.utils import get_settings, require_device


@frappe.whitelist(allow_guest=False)
def list_customers(limit: int = 100, search_text: str = None):
    require_device()
    limit = min(max(cint(limit), 1), 500)
    or_filters = []
    if search_text:
        or_filters = [
            ["name", "like", f"%{search_text}%"],
            ["customer_name", "like", f"%{search_text}%"],
            ["mobile_no", "like", f"%{search_text}%"],
        ]
    customers = frappe.get_all(
        "Customer",
        fields=["name", "customer_name", "mobile_no", "tax_id"],
        or_filters=or_filters,
        limit_page_length=limit,
        order_by="modified desc",
    )
    return {"customers": customers}


@frappe.whitelist(allow_guest=False)
def create_customer(customer_name: str = None, mobile_no: str = None, vat_number: str = None, address_line1: str = None, address_line2: str = None, city: str = None, pb_no: str = None):
    require_device()
    if not customer_name:
        frappe.throw(_("customer_name is required"))
    settings = get_settings()
    customer = frappe.new_doc("Customer")
    customer.customer_name = customer_name
    customer.customer_type = "Individual"
    customer.customer_group = settings.default_customer_group or "Commercial"
    customer.territory = settings.default_territory or "All Territories"
    if hasattr(customer, "mobile_no"):
        customer.mobile_no = mobile_no
    if hasattr(customer, "tax_id"):
        customer.tax_id = vat_number
    customer.insert(ignore_permissions=True)

    if address_line1:
        address = frappe.new_doc("Address")
        address.address_title = customer.customer_name
        address.address_type = "Billing"
        address.address_line1 = address_line1
        address.address_line2 = address_line2
        address.city = city
        address.pincode = pb_no
        if vat_number and hasattr(address, "tax_category"):
            address.tax_category = settings.default_tax_category or None
        address.append("links", {"link_doctype": "Customer", "link_name": customer.name})
        address.insert(ignore_permissions=True)

    return {"name": customer.name, "customer_name": customer.customer_name}
