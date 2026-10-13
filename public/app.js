const $app = document.getElementById("app");
const api = async (url, opts = {}) => {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error de red");
  return data;
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const STATUS = { pending: "Pendiente", assigned: "Asignado", in_transit: "En camino", delivered: "Entregado", failed: "Fallido" };
const badge = (s) => `<span class="badge s-${s}">${STATUS[s] ?? s}</span>`;
const toast = (msg, err) => { const t = document.createElement("div"); t.className = "toast" + (err ? " err" : ""); t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 3000); };
const md = (t) => esc(t).replace(/^#+ (.*)$/gm, "<h3>$1</h3>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/^[-*] (.*)$/gm, "<li>$1</li>").replace(/\n/g, "<br>");

let me = null, view = null, chatTimer = null;

const DEMO = [
  ["almacen.bogota@rutaclara.co", "Almacen2026!", "Almacén Bogotá"], ["almacen.medellin@rutaclara.co", "Almacen2026!", "Almacén Medellín"],
  ["almacen.cali@rutaclara.co", "Almacen2026!", "Almacén Cali"], ["almacen.barranquilla@rutaclara.co", "Almacen2026!", "Almacén Barranquilla"],
  ["carlos.ruiz@rutaclara.co", "Repartidor2026!", "Repartidor Bogotá"], ["andres.mejia@rutaclara.co", "Repartidor2026!", "Repartidor Medellín"],
  ["juan.perez@rutaclara.co", "Repartidor2026!", "Repartidor Cali"], ["diego.martinez@rutaclara.co", "Repartidor2026!", "Repartidor Barranquilla"],
];

function renderLogin() {
  $app.innerHTML = `<div class="login"><div class="login-brand"><div class="logo"><div class="logo-mark">R</div>RutaClara</div>
  <div><h1>Última milla, <em>sin rodeos.</em></h1><p>Cada nodo de almacén con su base de datos de pedidos, inventario y repartidores. Chat entre nodos y métricas con IA.</p></div>
  <div class="route-line"><span>BOG-N</span><span>MED-C</span><span>CAL-S</span><span>BAQ-P</span></div></div>
  <div class="login-form-wrap"><form class="login-form"><h2>Iniciar sesión</h2><p class="sub">Usa tu cuenta de almacén o de repartidor.</p>
  <label>Correo</label><input name="email" type="email" required /><label>Contraseña</label><input name="password" type="password" required />
  <button class="btn block">Entrar</button><div class="error"></div>
  <details class="demo"><summary>Cuentas de demostración</summary><div class="demo-grid">${DEMO.map((d, i) => `<button type="button" class="demo-acc" data-i="${i}"><span>${d[2]}</span><code>${d[0]}</code></button>`).join("")}</div></details></form></div></div>`;
  const f = $app.querySelector("form");
  f.querySelectorAll(".demo-acc").forEach((b) => (b.onclick = () => { const d = DEMO[b.dataset.i]; f.email.value = d[0]; f.password.value = d[1]; }));
  f.onsubmit = async (e) => {
    e.preventDefault();
    try { await api("/api/auth/login", { method: "POST", body: { email: f.email.value, password: f.password.value } }); boot(); }
    catch (err) { f.querySelector(".error").textContent = err.message; }
  };
}

function shell(tabs) {
  if (!view) view = tabs[0][0];
  $app.innerHTML = `<div class="shell"><aside class="side"><div class="logo"><div class="logo-mark">R</div>RutaClara</div>
  <div class="node"><small>${esc(me.warehouseCode)}</small><strong>${esc(me.warehouseName)}</strong></div>
  <nav class="nav">${tabs.map(([k, l]) => `<button data-k="${k}" class="${k === view ? "active" : ""}">${l}</button>`).join("")}</nav>
  <div class="who"><strong>${esc(me.name)}</strong><span>${me.role === "courier" ? "Repartidor" : "Operador de almacén"}</span><button class="btn sm" id="logout">Cerrar sesión</button></div></aside><main id="main"></main></div>`;
  $app.querySelectorAll(".nav button").forEach((b) => (b.onclick = () => { view = b.dataset.k; shell(tabs); }));
  $app.querySelector("#logout").onclick = async () => { await api("/api/auth/logout", { method: "POST" }); me = null; view = null; renderLogin(); };
  clearInterval(chatTimer);
  const main = $app.querySelector("#main");
  ({ orders: me.role === "courier" ? courierOrders : warehouseOrders, inventory, chat, metrics })[view](main).catch((e) => toast(e.message, true));
}

async function courierOrders(main) {
  const { orders } = await api("/api/courier/orders");
  main.innerHTML = `<div class="page-head"><div><h1>Mis pedidos</h1><p>${orders.filter((o) => ["assigned", "in_transit"].includes(o.status)).length} activos</p></div></div>
  ${orders.length ? `<div class="orders">${orders.map((o) => `<div class="card order ${o.priority === "urgente" ? "urgent" : ""}">
  <div class="order-top"><span class="code">${esc(o.code)}</span>${badge(o.status)}</div><div class="addr">${esc(o.address)}</div>
  <div class="meta"><span>👤 ${esc(o.customerName)} · ${esc(o.customerPhone)}</span><span>📦 ${esc(o.items)} · ${o.weightKg} kg</span>${o.notes ? `<span>📝 ${esc(o.notes)}</span>` : ""}</div>
  <div class="actions">${o.status === "assigned" ? `<button class="btn signal" data-id="${o.id}" data-s="in_transit">Iniciar ruta</button>` : ""}
  ${o.status === "in_transit" ? `<button class="btn ok" data-id="${o.id}" data-s="delivered">Entregado</button><button class="btn bad" data-id="${o.id}" data-s="failed">Fallido</button>` : ""}</div></div>`).join("")}</div>` : `<div class="empty">No tienes pedidos asignados.</div>`}`;
  main.querySelectorAll("[data-s]").forEach((b) => (b.onclick = async () => {
    try { await api(`/api/courier/orders/${b.dataset.id}`, { method: "PATCH", body: { status: b.dataset.s } }); courierOrders(main); } catch (e) { toast(e.message, true); }
  }));
}

async function warehouseOrders(main) {
  const d = await api("/api/warehouse/overview");
  main.innerHTML = `<div class="page-head"><div><h1>Pedidos del nodo</h1><p>${esc(d.warehouse.name)} · ${d.orders.length} pedidos</p></div><button class="btn signal" id="new">+ Nuevo pedido</button></div>
  <div class="card table-wrap"><table><thead><tr><th>Pedido</th><th>Cliente / dirección</th><th>Estado</th><th>Repartidor</th></tr></thead><tbody>
  ${d.orders.map((o) => `<tr><td><span class="code">${esc(o.code)}</span><small><span class="badge p-${o.priority}">${o.priority}</span></small></td>
  <td>${esc(o.customerName)}<small>${esc(o.address)}</small><small>${esc(o.items)}</small></td><td>${badge(o.status)}</td>
  <td>${o.status === "pending" ? `<div class="inline-assign"><select data-o="${o.id}">${d.couriers.map((c) => `<option value="${c.id}">${esc(c.name)} (${c.active})</option>`).join("")}</select><button class="btn sm" data-a="${o.id}">Asignar</button></div>` : esc(o.courierName ?? "—")}</td></tr>`).join("")}
  </tbody></table></div>
  <dialog id="dlg"><form method="dialog" id="nf"><h3>Nuevo pedido</h3><label>Cliente</label><input name="customerName" required /><label>Teléfono</label><input name="customerPhone" />
  <label>Dirección</label><input name="address" required /><label>Productos</label><input name="items" required />
  <div class="form-row"><div><label>Peso (kg)</label><input name="weightKg" type="number" step="0.1" value="1" /></div><div><label>Prioridad</label><select name="priority"><option>normal</option><option>alta</option><option>urgente</option></select></div></div>
  <button class="btn block">Crear</button></form></dialog>`;
  const dlg = main.querySelector("#dlg"), nf = main.querySelector("#nf");
  main.querySelector("#new").onclick = () => dlg.showModal();
  nf.onsubmit = async (e) => { e.preventDefault(); try { await api("/api/warehouse/orders", { method: "POST", body: Object.fromEntries(new FormData(nf)) }); dlg.close(); warehouseOrders(main); } catch (err) { toast(err.message, true); } };
  main.querySelectorAll("[data-a]").forEach((b) => (b.onclick = async () => {
    const courierId = main.querySelector(`select[data-o="${b.dataset.a}"]`).value;
    try { await api(`/api/warehouse/orders/${b.dataset.a}/assign`, { method: "POST", body: { courierId } }); toast("Pedido asignado"); warehouseOrders(main); } catch (e) { toast(e.message, true); }
  }));
}

async function inventory(main) {
  const d = await api("/api/warehouse/overview");
  main.innerHTML = `<div class="page-head"><div><h1>Inventario</h1><p>${esc(d.warehouse.name)}</p></div></div><div class="card table-wrap"><table><thead><tr><th>SKU</th><th>Producto</th><th class="num">Mínimo</th><th>Cantidad</th></tr></thead><tbody>
  ${d.inventory.map((i) => `<tr><td class="code">${esc(i.sku)}</td><td>${esc(i.name)} ${i.quantity < i.minStock ? '<span class="badge s-failed">Bajo</span>' : ""}</td><td class="num">${i.minStock}</td>
  <td><input class="qty" type="number" min="0" value="${i.quantity}" data-i="${i.id}" /></td></tr>`).join("")}</tbody></table></div>`;
  main.querySelectorAll("[data-i]").forEach((inp) => (inp.onchange = async () => {
    try { await api(`/api/warehouse/inventory/${inp.dataset.i}`, { method: "PATCH", body: { quantity: inp.value } }); toast("Inventario actualizado"); } catch (e) { toast(e.message, true); }
  }));
}

async function chat(main) {
  const { contacts } = await api("/api/chat/contacts");
  let current = contacts[0]?.key, lastId = 0;
  main.innerHTML = `<div class="page-head"><div><h1>Chat</h1><p>Comunicación entre nodos y repartidores</p></div></div>
  <div class="card chat"><div class="contacts">${contacts.map((c) => `<button class="contact" data-k="${c.key}"><strong>${esc(c.name)}</strong><small>${esc(c.lastMessage ?? c.subtitle)}</small></button>`).join("")}</div>
  <div class="thread"><div class="thread-head"></div><div class="msgs"></div><form class="composer"><input placeholder="Escribe un mensaje…" /><button class="btn">Enviar</button></form></div></div>`;
  const msgs = main.querySelector(".msgs");
  const load = async () => {
    if (!current) return;
    const { messages } = await api(`/api/chat/messages?with=${current}&after=${lastId}`);
    for (const m of messages) {
      lastId = m.id;
      msgs.insertAdjacentHTML("beforeend", `<div class="msg ${m.senderId === me.id ? "mine" : ""}"><div class="from">${esc(m.senderName)}</div><p>${esc(m.body)}</p><div class="time">${new Date(m.createdAt).toLocaleString("es-CO")}</div></div>`);
    }
    if (messages.length) msgs.scrollTop = msgs.scrollHeight;
  };
  const open = (k) => {
    current = k; lastId = 0; msgs.innerHTML = "";
    const c = contacts.find((x) => x.key === k);
    main.querySelector(".thread-head").innerHTML = `<strong>${esc(c.name)}</strong><small>${esc(c.subtitle)}</small>`;
    main.querySelectorAll(".contact").forEach((b) => b.classList.toggle("active", b.dataset.k === k));
    load();
  };
  main.querySelectorAll(".contact").forEach((b) => (b.onclick = () => open(b.dataset.k)));
  main.querySelector(".composer").onsubmit = async (e) => {
    e.preventDefault(); const inp = e.target.querySelector("input"); if (!inp.value.trim()) return;
    try { await api(`/api/chat/messages?with=${current}`, { method: "POST", body: { body: inp.value } }); inp.value = ""; load(); } catch (err) { toast(err.message, true); }
  };
  if (current) open(current);
  chatTimer = setInterval(() => load().catch(() => {}), 4000);
}

async function metrics(main) {
  const m = await api("/api/metrics");
  const t = m.totals, max = Math.max(1, ...m.daily.map((d) => d.created));
  main.innerHTML = `<div class="page-head"><div><h1>Métricas</h1><p>${esc(m.warehouse.name)}</p></div></div>
  <div class="grid kpis">${[["Pedidos totales", t.total], ["Abiertos", t.pending + t.assigned + t.inTransit], ["Entregados", t.delivered], ["Tasa de éxito", t.successRate == null ? "—" : t.successRate + "<small>%</small>"], ["Tiempo prom. entrega", (t.avgDeliveryMinutes || "—") + "<small> min</small>"], ["Urgentes abiertos", t.urgentOpen]]
    .map(([l, v]) => `<div class="card kpi"><div class="label">${l}</div><div class="value">${v}</div></div>`).join("")}</div>
  <div class="grid two"><div class="card"><h3>Pedidos últimos 7 días</h3><div class="bars">${m.daily.map((d) => `<div class="bar-col"><b>${d.created}</b><div class="bar-stack" style="height:${(d.created / max) * 140}px">
  <div style="flex:${d.delivered};background:var(--ok)"></div><div style="flex:${d.created - d.delivered};background:var(--signal)"></div></div><span>${d.day.slice(5)}</span></div>`).join("")}</div>
  <div class="legend"><span><i style="background:var(--ok)"></i>Entregados</span><span><i style="background:var(--signal)"></i>Otros</span></div></div>
  <div class="card"><h3>Repartidores</h3><table><tbody>${m.couriers.map((c) => `<tr><td>${esc(c.name)}<small>${esc(c.vehicle)}</small></td><td class="num">${c.delivered} ✓<small>${c.active} activos</small></td></tr>`).join("")}</tbody></table>
  <h3 style="margin-top:18px">Stock bajo</h3>${m.lowStock.length ? m.lowStock.map((s) => `<div>${esc(s.name)} <small>${s.quantity}/${s.minStock}</small></div>`).join("") : '<small class="hint">Sin alertas</small>'}</div></div>
  <div class="card ai" style="margin-top:16px"><h3><span class="spark">✦</span> Análisis con IA</h3><form class="ai-row"><input placeholder="Pregunta opcional, ej. ¿Qué repartidor necesita apoyo?" /><button class="btn signal">Analizar</button></form>
  <div class="ai-out"><p class="muted">Genera un resumen ejecutivo con hallazgos y recomendaciones basado en los datos del nodo.</p></div></div>`;
  main.querySelector(".ai-row").onsubmit = async (e) => {
    e.preventDefault(); const out = main.querySelector(".ai-out"); out.innerHTML = '<p class="muted">Analizando…</p>';
    try { const { insight } = await api("/api/metrics/insights", { method: "POST", body: { question: e.target.querySelector("input").value } }); out.innerHTML = md(insight); }
    catch (err) { out.innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
  };
}

async function boot() {
  try { ({ user: me } = await api("/api/auth/me")); } catch { return renderLogin(); }
  shell(me.role === "courier" ? [["orders", "Mis pedidos"], ["chat", "Chat con almacén"]] : [["orders", "Pedidos"], ["inventory", "Inventario"], ["chat", "Chat"], ["metrics", "Métricas IA"]]);
}
boot();
