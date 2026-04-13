import frappe


def after_install():
    if not frappe.db.exists("DocType", "Neotec POS Settings"):
        return
    if not frappe.db.exists("Neotec POS Settings", "Neotec POS Settings"):
        doc = frappe.get_doc({"doctype": "Neotec POS Settings"})
        doc.insert(ignore_permissions=True)
