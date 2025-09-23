import { put, type PutCommandOptions } from "@vercel/blob"
import PDFDocument from "pdfkit"

export interface InvoiceItem {
  name: string
  quantity: number
  priceEach: number
}

export interface InvoiceOrder {
  id: string
  customerName?: string | null
  subtotal?: number | null
  shippingCost?: number | null
  total: number
  createdAt?: string | Date | null
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(amount)
}

export async function generateInvoice(order: InvoiceOrder, items: InvoiceItem[]) {
  if (!order?.id) {
    throw new Error("Order ID dibutuhkan untuk pembuatan invoice")
  }

  if (typeof order.total !== "number") {
    throw new Error("Total order tidak valid")
  }

  const doc = new PDFDocument({ margin: 48 })
  const buffers: Buffer[] = []

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => buffers.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(buffers)))
    doc.on("error", (error: unknown) => reject(error))

    doc.fontSize(20).text("Invoice", { align: "center" })
    doc.moveDown()

    doc.fontSize(12)
    doc.text(`Order ID: ${order.id}`)
    if (order.customerName) {
      doc.text(`Nama: ${order.customerName}`)
    }
    if (order.createdAt) {
      const date = typeof order.createdAt === "string" ? new Date(order.createdAt) : order.createdAt
      doc.text(`Tanggal: ${date.toLocaleString("id-ID")}`)
    }
    doc.moveDown()

    doc.fontSize(14).text("Detail Pesanan", { underline: true })
    doc.moveDown(0.5)

    doc.fontSize(12)
    items.forEach((item, index) => {
      const lineTotal = item.priceEach * item.quantity
      doc.text(`${index + 1}. ${item.name}`)
      doc.text(`   Qty: ${item.quantity} x ${formatCurrency(item.priceEach)} = ${formatCurrency(lineTotal)}`)
      doc.moveDown(0.3)
    })

    doc.moveDown()
    if (typeof order.subtotal === "number") {
      doc.text(`Subtotal: ${formatCurrency(order.subtotal)}`)
    }
    if (typeof order.shippingCost === "number") {
      doc.text(`Ongkir: ${formatCurrency(order.shippingCost)}`)
    }

    doc.fontSize(14).text(`Total: ${formatCurrency(order.total)}`)
    doc.moveDown()

    doc.fontSize(11)
    doc.text("Silakan lakukan pembayaran ke rekening / QRIS yang tertera di website.")
    doc.text("Setelah bayar, unggah bukti transfer via dashboard.")

    doc.end()
  })

  const putOptions: PutCommandOptions = {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    putOptions.token = process.env.BLOB_READ_WRITE_TOKEN
  }

  const { url } = await put(`invoices/${order.id}.pdf`, pdfBuffer, putOptions)

  return url
}
