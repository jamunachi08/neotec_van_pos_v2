import frappe
from frappe import _
from frappe.utils import cint
from neotec_van_pos.utils import require_device


@frappe.whitelist(allow_guest=False)
def get_items(limit: int = 100, item_group: str = None, search_text: str = None):
    require_device()
    filters = {"disabled": 0, "is_sales_item": 1}
    if item_group:
        filters["item_group"] = item_group
    limit = min(max(cint(limit), 1), 500)
    or_filters = []
    if search_text:
        or_filters = [["item_code", "like", f"%{search_text}%"], ["item_name", "like", f"%{search_text}%"]]
    items = frappe.get_all(
        "Item",
        filters=filters,
        or_filters=or_filters,
        fields=["name", "item_code", "item_name", "item_group", "stock_uom", "standard_rate", "disabled"],
        limit_page_length=limit,
        order_by="modified desc",
    )
    item_groups = frappe.get_all("Item Group", filters={"is_group": 0}, fields=["name"], order_by="name asc")
    return {"items": items, "item_groups": item_groups}
