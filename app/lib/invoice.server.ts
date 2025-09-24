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

  // Pre-generate Code-128 barcode buffer for order id (ESM-friendly dynamic import)
  let barcodeBuffer: Buffer | null = null
  try {
    // @ts-ignore - bwip-js has no types in our project; dynamic import at runtime
    const mod: any = await import('bwip-js')
    const bwip: any = mod?.default ?? mod
    const opts = {
      bcid: 'code128',
      text: order.id,
      scale: 2,
      height: 12,
      includetext: false,
      paddingwidth: 0,
      paddingheight: 0
    }
    // Support both promise and callback forms of toBuffer
    barcodeBuffer = await (bwip?.toBuffer?.length >= 2
      ? new Promise<Buffer>((resolve, reject) => bwip.toBuffer(opts, (err: any, png: Buffer) => err ? reject(err) : resolve(png)))
      : bwip.toBuffer(opts))
  } catch {}

  const doc = new PDFDocument({ margin: 40 })
  const buffers: Buffer[] = []

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => buffers.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(buffers)))
    doc.on("error", (error: unknown) => reject(error))

    // Theme & helpers
    const ACCENT = "#ef4444" // tailwind red-500
    const TEXT_MUTED = "#64748b" // slate-500
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
    const drawDivider = () => {
      doc.moveTo(doc.x, doc.y).lineTo(doc.x + pageWidth, doc.y).strokeColor("#e5e7eb").lineWidth(1).stroke()
      doc.moveDown(0.6)
    }

    // Header bar
    doc.save()
    doc.rect(doc.page.margins.left, doc.page.margins.top, pageWidth, 56).fill(ACCENT)
    doc.fillColor("#fff").fontSize(22).text("Invoice", doc.page.margins.left + 16, doc.page.margins.top + 14)
    doc.restore()

    const headerBottomY = doc.page.margins.top + 56

    // Place Code-128 barcode at top-left under the header
    if (barcodeBuffer) {
      const barcodeWidth = 240
      const barcodeX = doc.page.margins.left
      const barcodeY = headerBottomY + 10
      try {
        doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeWidth })
        doc.fillColor(TEXT_MUTED).fontSize(9).text(`#${order.id.slice(0,8).toUpperCase()}`, barcodeX, barcodeY + 32)
      } catch {}
    }

    // Ensure subsequent text starts below barcode
    doc.y = Math.max(doc.y, headerBottomY + 50)
    doc.moveDown(1.4)

    // Seller & invoice meta
    const sellerName = process.env.NEXT_PUBLIC_STORE_NAME || "Mitra Buana Jaya Part"
    const sellerLine2 = process.env.NEXT_PUBLIC_STORE_DESC || "Solusi oli & sparepart premium"
    const createdAt = order.createdAt ? (typeof order.createdAt === "string" ? new Date(order.createdAt) : order.createdAt) : new Date()

    // Left block: seller
    doc.fontSize(12).fillColor("#0f172a").text(sellerName)
    doc.fillColor(TEXT_MUTED).text(sellerLine2)

    // Right block: invoice meta
    const rightX = doc.page.margins.left + pageWidth / 2
    const currentY = doc.y - 28
    doc.fontSize(12).fillColor("#0f172a").text(`Invoice #${order.id.slice(0, 8).toUpperCase()}`, rightX, currentY, { width: pageWidth / 2, align: "right" })
    doc.fillColor(TEXT_MUTED).text(createdAt.toLocaleString("id-ID"), rightX, doc.y, { width: pageWidth / 2, align: "right" })

    doc.moveDown(1)
    drawDivider()

    // Bill to
    doc.fontSize(12).fillColor(TEXT_MUTED).text("Tagihkan ke")
    doc.fillColor("#0f172a").fontSize(14).text(order.customerName || "Pelanggan")
    doc.moveDown(0.6)

    // Items table
    doc.fontSize(12)
    const colX = [doc.page.margins.left, doc.page.margins.left + 280, doc.page.margins.left + 360, doc.page.margins.left + 460]
    const rowHeight = 22

    // table header
    doc.fillColor(TEXT_MUTED)
    doc.text("Item", colX[0], doc.y)
    doc.text("Qty", colX[1], doc.y)
    doc.text("Harga", colX[2], doc.y)
    doc.text("Total", colX[3], doc.y)
    doc.moveDown(0.4)
    drawDivider()

    doc.fillColor("#0f172a")
    let tableY = doc.y
    items.forEach((item) => {
      const lineTotal = item.priceEach * item.quantity
      doc.text(item.name, colX[0], tableY, { width: colX[1] - colX[0] - 8 })
      doc.text(String(item.quantity), colX[1], tableY)
      doc.text(formatCurrency(item.priceEach), colX[2], tableY)
      doc.text(formatCurrency(lineTotal), colX[3], tableY)
      tableY += rowHeight
    })

    doc.moveTo(doc.page.margins.left, tableY - 6).lineTo(doc.page.margins.left + pageWidth, tableY - 6).strokeColor("#e5e7eb").lineWidth(1).stroke()
    doc.moveDown(0.6)

    // Totals
    const totalsX = doc.page.margins.left + pageWidth - 220
    let y = tableY + 6
    doc.fillColor(TEXT_MUTED).text("Subtotal", totalsX, y, { width: 100, align: "left" })
    doc.fillColor("#0f172a").text(formatCurrency(order.subtotal ?? (items.reduce((s, i) => s + i.priceEach * i.quantity, 0))), totalsX + 110, y, { width: 110, align: "right" })
    y += rowHeight
    doc.fillColor(TEXT_MUTED).text("Ongkir", totalsX, y, { width: 100, align: "left" })
    doc.fillColor("#0f172a").text(formatCurrency(order.shippingCost ?? 0), totalsX + 110, y, { width: 110, align: "right" })
    y += rowHeight
    doc.fillColor("#0f172a").fontSize(14).text("Total", totalsX, y, { width: 100, align: "left" })
    doc.fontSize(14).fillColor(ACCENT).text(formatCurrency(order.total), totalsX + 110, y, { width: 110, align: "right" })

    doc.moveDown(2)
    drawDivider()

    // Payment block - side-by-side layout: QRIS on the left, instructions on the right
    doc.fontSize(12).fillColor("#0f172a").text("Pembayaran")
    doc.moveDown(0.4)

    const boxSize = 120
    const gutter = 16
    const boxX = doc.page.margins.left
    const boxY = doc.y
    const textX = boxX + boxSize + gutter
    const textWidth = pageWidth - boxSize - gutter

    // QR/Bank image in left column
    try {
      const qrisPathCandidates = [
        "public/sampelqris.png",
        "public/sampelqris.jpg",
        "public/sampelqris.jpeg",
        "public/sampleqris.png",
        "public/sampleqris.jpg"
      ]
      let loaded = false
      for (const p of qrisPathCandidates) {
        try {
          doc.image(p, boxX, boxY, { width: boxSize, height: boxSize, fit: [boxSize, boxSize] })
          loaded = true
          break
        } catch {}
      }
      if (!loaded) {
        doc.roundedRect(boxX, boxY, boxSize, boxSize, 8).strokeColor("#cbd5e1").stroke()
      }
    } catch {
      doc.roundedRect(boxX, boxY, boxSize, boxSize, 8).strokeColor("#cbd5e1").stroke()
    }
    doc.fillColor(TEXT_MUTED).fontSize(10).text("QRIS", boxX, boxY + boxSize + 6, { width: boxSize, align: "center" })

    // Payment instructions in right column, aligned to the top of the QRIS box
    doc.fillColor(TEXT_MUTED).fontSize(11)
    const paymentText = `Lakukan pembayaran via QRIS statis atau transfer manual yang tertera di portal.\n\nSetelah bayar, unggah bukti transfer melalui dashboard atau kirim bukti via WhatsApp agar pesanan segera diproses.`
    doc.text(paymentText, textX, boxY, { width: textWidth, align: "left" })

    // Move cursor below the taller of the two columns
    const contentBottom = Math.max(boxY + boxSize + 18, doc.y)
    doc.y = contentBottom

    // (Barcode already placed at top-left)

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
