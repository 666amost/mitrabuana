import type { Order, OrderLineItem, Product } from "~/lib/db.server";

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "sample-oil-revmax",
    name: "RevMax Pro-S 10W-40 Full Synthetic",
    price: 210000,
    weightGram: 920,
    lengthCm: 6,
    widthCm: 6,
    heightCm: 24,
    stock: 18,
    images: ["https://images.unsplash.com/photo-1601562235348-1f61c7cb276a?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "sample-brakepads-streetguard",
    name: "StreetGuard S-Series Brake Pads",
    price: 165000,
    weightGram: 520,
    lengthCm: 10,
    widthCm: 8,
    heightCm: 4,
    stock: 32,
    images: ["https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "sample-sparkplug-iridium",
    name: "SparkForce Iridium Spark Plug Pack",
    price: 98000,
    weightGram: 140,
    lengthCm: 9,
    widthCm: 3,
    heightCm: 3,
    stock: 48,
    images: ["https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80"]
  }
];

const sampleLineItems: OrderLineItem[] = [
  {
    productId: SAMPLE_PRODUCTS[0].id,
    productName: SAMPLE_PRODUCTS[0].name,
    priceEach: SAMPLE_PRODUCTS[0].price,
    quantity: 2
  },
  {
    productId: SAMPLE_PRODUCTS[2].id,
    productName: SAMPLE_PRODUCTS[2].name,
    priceEach: SAMPLE_PRODUCTS[2].price,
    quantity: 1
  }
];

export const SAMPLE_ORDER: { order: Order; items: OrderLineItem[] } = {
  order: {
    id: "sample-order-001",
    userId: null,
    customerName: "Andra Putra",
    customerEmail: "andra@example.com",
    customerPhone: "081234567890",
    subtotal: sampleLineItems.reduce((acc, item) => acc + item.priceEach * item.quantity, 0),
    shippingCourier: "JNE",
    shippingService: "REG",
    shippingCost: 35000,
    total: 0,
    status: "PENDING_PAYMENT",
    invoiceUrl: null,
    paymentProofUrl: null,
    trackingNumber: "JNE123456789ID",
    trackingHistory: [
      {
        status: "Order diterima",
        description: "Order oli & sparepart masuk ke dashboard",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        status: "Packing",
        description: "Produk dibungkus dengan kemasan anti tumpah",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
      }
    ],
    address: {
      line1: "Jl. Melati No. 8",
      line2: "Kompleks Cendana",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12560"
    },
    notes: "Include sticker torqueX, pastikan segel oli utuh",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString()
  },
  items: sampleLineItems
};

SAMPLE_ORDER.order.total = SAMPLE_ORDER.order.subtotal + (SAMPLE_ORDER.order.shippingCost ?? 0);

export const SAMPLE_ORDERS = [SAMPLE_ORDER.order];
