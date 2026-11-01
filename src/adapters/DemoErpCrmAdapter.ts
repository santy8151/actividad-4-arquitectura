export const demoData = {
  orders: [
    { id: 'ord-1001', code: 'PED-1001', customer: 'Mercancías Andina', city: 'Bogotá', total: 1850000, status: 'Listo para despacho', lastMileStatus: 'Assigned', eta: '08:40' },
    { id: 'ord-1002', code: 'PED-1002', customer: 'Gama Retail', city: 'Medellín', total: 980000, status: 'En preparación', lastMileStatus: 'Pending', eta: '09:15' },
    { id: 'ord-1003', code: 'PED-1003', customer: 'Casa del Valle', city: 'Cali', total: 2140000, status: 'Confirmado', lastMileStatus: 'Assigned', eta: '10:05' }
  ],
  inventory: [
    { sku: 'SKU-001', name: 'Caja de cajas', category: 'Packaging', price: 12000, stockPhysical: 380, stockReserved: 95, stockAvailable: 285, minimumLevel: 80 },
    { sku: 'SKU-023', name: 'Pallet de alimentos', category: 'Alimentos', price: 65000, stockPhysical: 120, stockReserved: 48, stockAvailable: 72, minimumLevel: 35 },
    { sku: 'SKU-104', name: 'Kit médico', category: 'Salud', price: 89000, stockPhysical: 56, stockReserved: 30, stockAvailable: 26, minimumLevel: 25 }
  ],
  warehouses: [
    { id: 'wh-01', name: 'Bodega Norte Bogotá', city: 'Bogotá', address: 'Autopista Norte 80', capacity: 3200, occupancy: 2185, stock: 2160 },
    { id: 'wh-02', name: 'Bodega Medellín Centro', city: 'Medellín', address: 'Cra 42 #12-30', capacity: 2500, occupancy: 1780, stock: 1430 },
    { id: 'wh-03', name: 'Cali Sur', city: 'Cali', address: 'Av 6N #55-40', capacity: 2000, occupancy: 1400, stock: 1230 }
  ],
  customers: [
    { id: 'cust-1', name: 'Mercancías Andina', document: 'NIT 900.012.345-7', city: 'Bogotá', email: 'logistica@andina.co', phone: '3101112233', segment: 'Enterprise' },
    { id: 'cust-2', name: 'Gama Retail', document: 'NIT 890.123.456-9', city: 'Medellín', email: 'operaciones@gama.co', phone: '3002134455', segment: 'Retail' },
    { id: 'cust-3', name: 'Casa del Valle', document: 'CC 1012345678', city: 'Cali', email: 'soporte@casadelvalle.co', phone: '3209876543', segment: 'B2C' }
  ],
  incidents: [
    { id: 'inc-201', code: 'INC-201', type: 'Retraso de entrega', priority: 'Alta', status: 'Abierta', deliveryId: 'd1000000-0000-4000-8000-000000000001', owner: 'Carlos Álvarez' },
    { id: 'inc-202', code: 'INC-202', type: 'Falta de documento', priority: 'Media', status: 'En revisión', deliveryId: 'd1000000-0000-4000-8000-000000000001', owner: 'Ana López' }
  ],
  kpis: {
    orders: 145,
    pendingDeliveries: 18,
    assignedDeliveries: 31,
    completedDeliveries: 96,
    availableCouriers: 12,
    activeVehicles: 9,
    openIncidents: 6,
    readyOrders: 14
  }
};

export function getDashboardMetrics() {
  return demoData.kpis;
}

export function getOrders() {
  return demoData.orders;
}

export function getInventory() {
  return demoData.inventory;
}

export function getWarehouses() {
  return demoData.warehouses;
}

export function getCustomers() {
  return demoData.customers;
}

export function getIncidents() {
  return demoData.incidents;
}
