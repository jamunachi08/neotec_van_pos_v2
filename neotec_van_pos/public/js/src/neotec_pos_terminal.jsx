import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

const THEMES = {
  neotec: { name: "Neotec Blue", page: "#f8fafc", panel: "#ffffff", soft: "#dbe3f0", text: "#0f172a", subtext: "#64748b", primary: "#1d4ed8", primarySoft: "#dbeafe", accent: "#0f766e" },
  sunset: { name: "Sunset Gold", page: "#fffaf5", panel: "#ffffff", soft: "#fde7cf", text: "#3b2414", subtext: "#8a6246", primary: "#c2410c", primarySoft: "#ffedd5", accent: "#b45309" },
  graphite: { name: "Graphite Dark", page: "#020617", panel: "#0f172a", soft: "#1e293b", text: "#f8fafc", subtext: "#94a3b8", primary: "#38bdf8", primarySoft: "#082f49", accent: "#22c55e" },
  emerald: { name: "Emerald Retail", page: "#f6fffb", panel: "#ffffff", soft: "#d1fae5", text: "#052e16", subtext: "#3f7c62", primary: "#059669", primarySoft: "#d1fae5", accent: "#0f766e" },
};

const DEFAULT_SETTINGS = {
  app_title: "Neotec POS Terminal",
  app_subtitle: "Billing, sync, and cashier workflow",
  terminal_code: "VAN-01",
  device_code: "NEOTEC-01",
  theme_key: "neotec",
  editable_mode: 1,
  default_customer: "Walk-In Customer",
  enable_barcode_scan: 1,
  enable_offline_badge: 1,
};

const PRODUCTS = [
  { id: "ITEM-0001", name: "Fresh Milk 1L", category: "Dairy", price: 6.5, stock: 42, barcode: "628100100001" },
  { id: "ITEM-0002", name: "Arabic Bread", category: "Bakery", price: 2.0, stock: 60, barcode: "628100100002" },
  { id: "ITEM-0003", name: "Orange Juice", category: "Beverages", price: 7.25, stock: 18, barcode: "628100100003" },
  { id: "ITEM-0004", name: "Dates Premium", category: "Snacks", price: 18.0, stock: 20, barcode: "628100100004" },
  { id: "ITEM-0005", name: "Mineral Water", category: "Beverages", price: 1.5, stock: 120, barcode: "628100100005" },
  { id: "ITEM-0006", name: "Chicken Sandwich", category: "Ready Food", price: 12.0, stock: 15, barcode: "628100100006" },
  { id: "ITEM-0007", name: "Chocolate Bar", category: "Snacks", price: 4.0, stock: 55, barcode: "628100100007" },
  { id: "ITEM-0008", name: "Rice 5kg", category: "Grocery", price: 27.0, stock: 14, barcode: "628100100008" },
];

const CUSTOMERS = [
  { id: "CUST-0001", name: "Walk-In Customer", phone: "-" },
  { id: "CUST-0002", name: "Al Noor Trading", phone: "+966500000001" },
  { id: "CUST-0003", name: "Green Valley Stores", phone: "+966500000002" },
];

const fmt = (v) => `${Number(v || 0).toFixed(2)} SAR`;

function callBackend(method, args = {}) {
  return new Promise((resolve, reject) => {
    if (typeof frappe === "undefined" || !frappe.call) {
      reject(new Error("frappe.call is not available"));
      return;
    }
    frappe.call({
      method,
      args,
      callback: (r) => resolve(r.message),
      error: (err) => reject(err),
    });
  });
}

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(CUSTOMERS[0]);
  const [online, setOnline] = useState(true);
  const [showDesigner, setShowDesigner] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    callBackend("neotec_van_pos.api.ui_settings.get_ui_settings")
      .then((data) => data && setSettings((s) => ({ ...s, ...data })))
      .catch(() => {});
  }, []);

  const theme = THEMES[settings.theme_key] || THEMES.neotec;
  const categories = useMemo(() => ["All", ...new Set(PRODUCTS.map((p) => p.category))], []);
  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const q = query.trim().toLowerCase();
      const catOK = category === "All" || p.category === category;
      const qOK = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.barcode.includes(q);
      return catOK && qOK;
    });
  }, [query, category]);

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const change = Math.max(Number(amountTendered || 0) - total, 0);

  const cardStyle = (extra = {}) => ({
    background: theme.panel,
    border: `1px solid ${theme.soft}`,
    borderRadius: 20,
    boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
    ...extra,
  });

  const buttonPrimary = { background: theme.primary, color: "#fff", border: "none", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 600 };
  const buttonSoft = { background: theme.primarySoft, color: theme.text, border: `1px solid ${theme.soft}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 600 };
  const buttonGhost = { background: "transparent", color: theme.text, border: `1px solid ${theme.soft}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 600 };

  const addToCart = (product) => {
    setCart((prev) => {
      const ex = prev.find((r) => r.id === product.id);
      return ex ? prev.map((r) => (r.id === product.id ? { ...r, qty: r.qty + 1 } : r)) : [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) => prev.map((r) => (r.id === id ? { ...r, qty: Math.max(0, r.qty + delta) } : r)).filter((r) => r.qty > 0));
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      await callBackend("neotec_van_pos.api.ui_settings.save_ui_settings", { payload: JSON.stringify(settings) });
      if (typeof frappe !== "undefined") {
        frappe.show_alert({ message: "POS UI settings saved", indicator: "green" });
      }
      setShowDesigner(false);
    } catch (e) {
      if (typeof frappe !== "undefined") {
        frappe.msgprint("Unable to save POS UI settings.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.page, color: theme.text, padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .neo-grid{display:grid;grid-template-columns:minmax(0,1.3fr) 420px;gap:16px;max-width:1440px;margin:0 auto;}
        .neo-products{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;}
        .neo-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
        .neo-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;padding:24px;z-index:1000;}
        .neo-modal{max-width:980px;width:100%;max-height:90vh;overflow:auto;}
        .neo-input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid ${theme.soft};outline:none;background:${theme.panel};color:${theme.text};}
        .neo-muted{color:${theme.subtext};}
        @media (max-width: 1100px){.neo-grid{grid-template-columns:1fr;}.neo-cart{position:static!important;}}
      `}</style>

      <div className="neo-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16 }}>
            <div style={cardStyle({ padding: 18 })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{settings.app_title}</div>
                  <div className="neo-muted" style={{ marginTop: 6 }}>{settings.app_subtitle}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {settings.enable_offline_badge ? <span style={{ ...buttonSoft, display: "inline-flex", alignItems: "center" }}>{online ? "Online" : "Offline"}</span> : null}
                  <span style={{ ...buttonSoft, display: "inline-flex", alignItems: "center" }}>Device {settings.device_code}</span>
                  <button style={buttonGhost} onClick={() => setOnline((v) => !v)}>{online ? "Go Offline" : "Go Online"}</button>
                  <button style={buttonGhost} onClick={() => setShowDesigner(true)}>Designer</button>
                </div>
              </div>
            </div>

            <div style={cardStyle({ padding: 18, minWidth: 260 })}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, textAlign: "center" }}>
                <div><div className="neo-muted" style={{ fontSize: 12 }}>Queued Sync</div><div style={{ fontSize: 24, fontWeight: 700 }}>12</div></div>
                <div><div className="neo-muted" style={{ fontSize: 12 }}>Today Sales</div><div style={{ fontSize: 24, fontWeight: 700 }}>48</div></div>
                <div><div className="neo-muted" style={{ fontSize: 12 }}>Terminal</div><div style={{ fontSize: 24, fontWeight: 700 }}>{settings.terminal_code}</div></div>
              </div>
            </div>
          </div>

          <div style={cardStyle({ padding: 18 })}>
            <div style={{ display: "grid", gridTemplateColumns: settings.enable_barcode_scan ? "1fr auto" : "1fr", gap: 12 }}>
              <input className="neo-input" placeholder="Search by item, code, or barcode" value={query} onChange={(e) => setQuery(e.target.value)} />
              {settings.enable_barcode_scan ? <button style={buttonGhost}>Scan Barcode</button> : null}
            </div>

            <div className="neo-tabs">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} style={category === cat ? buttonPrimary : buttonSoft}>{cat}</button>
              ))}
            </div>

            <div className="neo-products" style={{ marginTop: 16 }}>
              {filtered.map((p) => (
                <div key={p.id} style={cardStyle({ padding: 16 })}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div className="neo-muted" style={{ fontSize: 12 }}>{p.id}</div>
                      <div style={{ fontWeight: 700, marginTop: 6, lineHeight: 1.35 }}>{p.name}</div>
                    </div>
                    <div style={{ background: theme.primarySoft, color: theme.primary, width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>#</div>
                  </div>
                  <div className="neo-muted" style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13 }}>
                    <span>{p.category}</span>
                    <span>Stock: {p.stock}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                    <strong>{fmt(p.price)}</strong>
                    <button style={buttonPrimary} onClick={() => addToCart(p)}>Add</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="neo-cart" style={{ ...cardStyle({ padding: 18 }), position: "sticky", top: 12, alignSelf: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>Cart</div>
            <button style={buttonGhost} onClick={() => setCart([])}>Clear</button>
          </div>

          <div style={{ ...cardStyle({ padding: 14, marginTop: 12, background: theme.primarySoft }) }}>
            <div className="neo-muted" style={{ fontSize: 12 }}>Customer</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{customer.name}</div>
            <div className="neo-muted" style={{ fontSize: 12, marginTop: 2 }}>{customer.phone}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {CUSTOMERS.map((c) => (
                <button key={c.id} style={c.id === customer.id ? buttonPrimary : buttonSoft} onClick={() => setCustomer(c)}>{c.name}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflow: "auto", paddingRight: 2 }}>
            {cart.length === 0 ? <div style={{ border: `1px dashed ${theme.soft}`, borderRadius: 16, padding: 28, textAlign: "center", color: theme.subtext }}>No items in cart yet.</div> : null}
            {cart.map((r) => (
              <div key={r.id} style={cardStyle({ padding: 14 })}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                    <div className="neo-muted" style={{ fontSize: 12 }}>{r.id}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{fmt(r.qty * r.price)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <span className="neo-muted" style={{ fontSize: 13 }}>{fmt(r.price)} each</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button style={buttonGhost} onClick={() => updateQty(r.id, -1)}>-</button>
                    <strong>{r.qty}</strong>
                    <button style={buttonGhost} onClick={() => updateQty(r.id, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${theme.soft}`, marginTop: 16, paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="neo-muted">Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="neo-muted">VAT 15%</span><span>{fmt(vat)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Total</span><span>{fmt(total)}</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
              {["Cash", "Card", "Mixed"].map((m) => <button key={m} style={paymentMode === m ? buttonPrimary : buttonSoft} onClick={() => setPaymentMode(m)}>{m}</button>)}
            </div>
            <input className="neo-input" type="number" placeholder="Amount tendered" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} style={{ marginTop: 12 }} />
            <div className="neo-muted" style={{ marginTop: 8, fontSize: 13 }}>Change: {fmt(change)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
              <button style={buttonGhost}>Hold</button>
              <button style={{ ...buttonPrimary, opacity: cart.length ? 1 : 0.65 }} disabled={!cart.length} onClick={() => typeof frappe !== "undefined" && frappe.msgprint("Connect this button to neotec_van_pos.api.v2.sync.submit_invoice.")}>Pay Now</button>
            </div>
          </div>
        </div>
      </div>

      {showDesigner ? (
        <div className="neo-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowDesigner(false)}>
          <div className="neo-modal" style={cardStyle({ padding: 20 })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>POS Screen Designer</div>
                <div className="neo-muted" style={{ marginTop: 4 }}>Edit labels, identity, and color palette, then save them into the Neotec app.</div>
              </div>
              <button style={buttonGhost} onClick={() => setShowDesigner(false)}>Close</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 20, marginTop: 18 }}>
              <div>
                <label style={{ display: "block", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Screen Title</div>
                  <input className="neo-input" value={settings.app_title || ""} disabled={!settings.editable_mode} onChange={(e) => setSettings((s) => ({ ...s, app_title: e.target.value }))} />
                </label>
                <label style={{ display: "block", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Subtitle</div>
                  <input className="neo-input" value={settings.app_subtitle || ""} disabled={!settings.editable_mode} onChange={(e) => setSettings((s) => ({ ...s, app_subtitle: e.target.value }))} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={{ display: "block", marginBottom: 12 }}>
                    <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Terminal Code</div>
                    <input className="neo-input" value={settings.terminal_code || ""} disabled={!settings.editable_mode} onChange={(e) => setSettings((s) => ({ ...s, terminal_code: e.target.value }))} />
                  </label>
                  <label style={{ display: "block", marginBottom: 12 }}>
                    <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Device Code</div>
                    <input className="neo-input" value={settings.device_code || ""} disabled={!settings.editable_mode} onChange={(e) => setSettings((s) => ({ ...s, device_code: e.target.value }))} />
                  </label>
                </div>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${theme.soft}`, borderRadius: 16, padding: 14, marginTop: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Editable Mode</div>
                    <div className="neo-muted" style={{ fontSize: 13, marginTop: 4 }}>Only users with write access to the settings DocType should change this in production.</div>
                  </div>
                  <input type="checkbox" checked={!!settings.editable_mode} onChange={(e) => setSettings((s) => ({ ...s, editable_mode: e.target.checked ? 1 : 0 }))} />
                </label>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Color Palette</div>
                {Object.entries(THEMES).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, theme_key: key }))}
                    style={{ width: "100%", textAlign: "left", padding: 14, borderRadius: 16, border: `1px solid ${theme.soft}`, background: key === settings.theme_key ? value.primarySoft : theme.panel, marginBottom: 10, cursor: "pointer", color: theme.text }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{value.name}</div>
                        <div className="neo-muted" style={{ fontSize: 12, marginTop: 4 }}>{key}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[value.primary, value.accent, value.primarySoft, value.panel].map((c) => (
                          <span key={c} style={{ width: 20, height: 20, borderRadius: 999, display: "inline-block", background: c, border: `1px solid ${value.soft}` }} />
                        ))}
                      </div>
                    </div>
                  </button>
                ))}

                <div style={cardStyle({ padding: 14, marginTop: 8 })}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>Selected Palette Preview</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {[theme.primary, theme.accent, theme.primarySoft, theme.panel].map((c) => (
                      <div key={c} style={{ padding: 10, borderRadius: 12, background: c, border: `1px solid ${theme.soft}`, fontSize: 11, textAlign: "center" }}>{c}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button style={buttonGhost} onClick={() => setShowDesigner(false)}>Cancel</button>
              <button style={{ ...buttonPrimary, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={saveSettings}>{busy ? "Saving..." : "Save Layout"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

window.mountNeotecPOS = function(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  createRoot(el).render(<App />);
};
