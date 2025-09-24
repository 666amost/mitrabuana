import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "DELIVERED"

export interface Product {
  id: string
  name: string
  price: number
  weightGram: number
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  stock: number
  images: string[]
}

export interface Order {
  id: string
  userId: string | null
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  subtotal: number
  shippingCourier: string | null
  shippingService: string | null
  shippingCost: number | null
  total: number
  status: OrderStatus
  invoiceUrl?: string | null
  paymentProofUrl?: string | null
  trackingNumber?: string | null
  trackingHistory?: unknown[] | null
  address: Record<string, unknown>
  notes?: string | null
  createdAt: string
}

export interface OrderLineItem {
  productId: string
  productName: string
  priceEach: number
  quantity: number
}

export interface CreateOrderPayload {
  userId?: string | null
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  address: Record<string, unknown>
  courier: string
  courierService: string
  shippingCost: number
  items: Array<{ productId: string; quantity: number }>
  note?: string | null
}

export interface CreateOrderResult {
  order: Order
  lineItems: OrderLineItem[]
}

export interface Profile {
  id: string
  name?: string | null
  phone?: string | null
  address?: Record<string, unknown> | null
  role?: string
  createdAt?: string | null
}

let cachedClient: SupabaseClient | null = null

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY));
}

function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient
  }

  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY/ANON_KEY harus di-set")
  }

  const url = process.env.SUPABASE_URL!
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY)!

  cachedClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false
    }
  })

  return cachedClient
}

function mapProduct(record: any): Product {
  return {
    id: record.id,
    name: record.name,
    price: record.price,
    weightGram: record.weight_gram,
    lengthCm: record.length_cm,
    widthCm: record.width_cm,
    heightCm: record.height_cm,
    stock: record.stock ?? 0,
    images: record.images ?? []
  }
}

function mapOrder(record: any): Order {
  return {
    id: record.id,
    userId: record.user_id ?? null,
    customerName: record.customer_name,
    customerEmail: record.customer_email,
    customerPhone: record.customer_phone,
    subtotal: record.subtotal,
    shippingCourier: record.shipping_courier,
    shippingService: record.shipping_service,
    shippingCost: record.shipping_cost,
    total: record.total,
    status: record.status,
    invoiceUrl: record.invoice_url,
    paymentProofUrl: record.payment_proof_url,
    trackingNumber: record.tracking_number,
    trackingHistory: record.tracking_history,
    address: record.address_json ?? {},
    notes: record.notes,
    createdAt: record.created_at
  }
}

export async function listProducts() {
  const client = getSupabaseClient()
  const { data, error } = await client.from("products").select("*").order("name", { ascending: true })

  if (error) {
    throw new Error(`Gagal mengambil produk: ${error.message}`)
  }

  return (data ?? []).map(mapProduct)
}

export async function getProductById(id: string) {
  const client = getSupabaseClient()
  const { data, error } = await client.from("products").select("*").eq("id", id).maybeSingle()

  if (error) {
    throw new Error(`Gagal mengambil produk: ${error.message}`)
  }

  return data ? mapProduct(data) : null
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  if (!payload.items.length) {
    throw new Error("Order harus memiliki minimal satu item")
  }

  const client = getSupabaseClient()
  const productIds = payload.items.map((item) => item.productId)
  const { data: products, error: productsError } = await client
    .from("products")
    .select("id, name, price, stock")
    .in("id", productIds)

  if (productsError) {
    throw new Error(`Gagal mengambil produk untuk order: ${productsError.message}`)
  }

  if (!products || products.length !== productIds.length) {
    throw new Error("Sebagian produk tidak ditemukan atau sudah dihapus")
  }

  const lineItems: OrderLineItem[] = payload.items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)
    if (!product) {
      throw new Error(`Produk ${item.productId} tidak ditemukan`)
    }

    if (product.stock !== null && typeof product.stock === "number" && product.stock < item.quantity) {
      throw new Error(`Stok produk ${product.name} tidak mencukupi`)
    }

    return {
      productId: product.id,
      productName: product.name,
      priceEach: product.price,
      quantity: item.quantity
    }
  })

  const subtotal = lineItems.reduce((acc, item) => acc + item.priceEach * item.quantity, 0)
  const total = subtotal + payload.shippingCost

  const { data: insertedOrder, error: insertError } = await client
    .from("orders")
    .insert({
      user_id: payload.userId ?? null,
      customer_name: payload.customerName,
      customer_email: payload.customerEmail,
      customer_phone: payload.customerPhone ?? null,
      subtotal,
      shipping_courier: payload.courier,
      shipping_service: payload.courierService,
      shipping_cost: payload.shippingCost,
      total,
      status: "PENDING_PAYMENT",
      invoice_url: null,
      payment_proof_url: null,
      tracking_number: null,
      tracking_history: [],
      address_json: payload.address,
      notes: payload.note ?? null
    })
    .select("*")
    .single()

  if (insertError || !insertedOrder) {
    throw new Error(`Gagal membuat order: ${insertError?.message ?? "unknown"}`)
  }

  const orderItems = lineItems.map((item) => ({
    order_id: insertedOrder.id,
    product_id: item.productId,
    product_snapshot: {
      id: item.productId,
      name: item.productName,
      price: item.priceEach
    },
    quantity: item.quantity,
    price_each: item.priceEach
  }))

  const { error: orderItemsError } = await client.from("order_items").insert(orderItems)

  if (orderItemsError) {
    throw new Error(`Gagal menambahkan detail order: ${orderItemsError.message}`)
  }

  return {
    order: mapOrder(insertedOrder),
    lineItems
  }
}

export async function listOrders(status?: OrderStatus) {
  const client = getSupabaseClient()
  let query = client.from("orders").select("*").order("created_at", { ascending: false })
  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal mengambil daftar order: ${error.message}`)
  }

  return (data ?? []).map(mapOrder)
}

export async function listOrdersByUser(userId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Gagal mengambil order pengguna: ${error.message}`)
  }

  return (data ?? []).map(mapOrder)
}

export async function getOrderWithItems(orderId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("orders")
    .select("*, order_items:order_items(id, product_id, product_snapshot, quantity, price_each)")
    .eq("id", orderId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal mengambil data order: ${error.message}`)
  }

  if (!data) {
    return null
  }

  const order = mapOrder(data)
  const items: OrderLineItem[] = (data.order_items ?? []).map((record: any) => ({
    productId: record.product_id,
    productName: record.product_snapshot?.name ?? "",
    priceEach: record.price_each,
    quantity: record.quantity
  }))

  return { order, items }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("*")
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal mengubah status order: ${error.message}`)
  }

  return data ? mapOrder(data) : null
}

export async function setInvoiceUrl(orderId: string, url: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("orders")
    .update({ invoice_url: url })
    .eq("id", orderId)
    .select("*")
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal menyimpan invoice: ${error.message}`)
  }

  return data ? mapOrder(data) : null
}

export async function attachPaymentProof(orderId: string, proofUrl: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("orders")
    .update({ payment_proof_url: proofUrl })
    .eq("id", orderId)
    .select("*")
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal menyimpan bukti transfer: ${error.message}`)
  }

  return data ? mapOrder(data) : null
}

export async function updateTracking(orderId: string, trackingNumber: string, history: unknown[]) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("orders")
    .update({ tracking_number: trackingNumber, tracking_history: history })
    .eq("id", orderId)
    .select("*")
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal memperbarui tracking: ${error.message}`)
  }

  return data ? mapOrder(data) : null
}

export async function findOrderByTrackingNumber(awb: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("tracking_number", awb)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal mencari order berdasarkan AWB: ${error.message}`)
  }

  return data ? mapOrder(data) : null
}

function mapProfile(record: any): Profile {
  return {
    id: record.id,
    name: record.name ?? null,
    phone: record.phone ?? null,
    address: record.address_json ?? null,
    role: record.role ?? 'customer',
    createdAt: record.created_at ?? null
  }
}

export async function getProfile(id: string) {
  const client = getSupabaseClient()
  const { data, error } = await client.from("profiles").select("*").eq("id", id).maybeSingle()

  if (error) {
    throw new Error(`Gagal mengambil profil: ${error.message}`)
  }

  return data ? mapProfile(data) : null
}

export async function upsertProfile(id: string, payload: { name?: string | null; phone?: string | null; address?: Record<string, unknown> | null; role?: string | null }) {
  const client = getSupabaseClient()
  // Only include 'role' if explicitly provided, otherwise preserve existing value.
  const toUpsert: Record<string, unknown> = {
    id,
    name: payload.name ?? null,
    phone: payload.phone ?? null,
    address_json: payload.address ?? null
  }
  if (typeof payload.role !== 'undefined' && payload.role !== null) {
    toUpsert.role = payload.role
  }

  const { data, error } = await client.from("profiles").upsert(toUpsert, { onConflict: "id" }).select("*").maybeSingle()

  if (error) {
    throw new Error(`Gagal menyimpan profil: ${error.message}`)
  }

  return data ? mapProfile(data) : null
}



