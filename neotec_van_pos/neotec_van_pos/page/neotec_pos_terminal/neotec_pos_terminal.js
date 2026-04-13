frappe.pages['neotec-pos-terminal'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Neotec POS Terminal',
        single_column: true,
    });

    page.main.html('<div id="neotec-pos-root"></div>');

    frappe.require('/assets/neotec_van_pos/js/neotec_pos_terminal.bundle.js', function() {
        if (window.mountNeotecPOS) {
            window.mountNeotecPOS('#neotec-pos-root');
        }
    });
};
