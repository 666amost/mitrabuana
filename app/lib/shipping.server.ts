export interface Dimensions {
  l: number
  w: number
  h: number
}

export interface RateCard {
  courier: string
  service: string
  baseKg: number
  basePrice: number
  addlKgPrice: number
  maxKg?: number
  leadTimeDays?: [number, number]
  coverageAreas?: string[]
}

export const DEFAULT_RATE_CARDS: RateCard[] = [
  {
    courier: "JNE",
    service: "REG",
    baseKg: 1,
    basePrice: 20000,
    addlKgPrice: 8000,
    leadTimeDays: [2, 4]
  },
  {
    courier: "JNE",
    service: "YES",
    baseKg: 1,
    basePrice: 38000,
    addlKgPrice: 9000,
    leadTimeDays: [1, 1]
  },
  {
    courier: "SiCepat",
    service: "REG",
    baseKg: 1,
    basePrice: 22000,
    addlKgPrice: 8500,
    leadTimeDays: [2, 3]
  }
]

export function calculateBillableWeightKg(weightGram: number, dims: Dimensions) {
  const actualKg = Math.max(1, Math.ceil(weightGram / 1000))
  const volumetricKg = Math.max(1, Math.ceil((dims.l * dims.w * dims.h) / 6000))
  return Math.max(actualKg, volumetricKg)
}

export function calculateShipping(weightGram: number, dims: Dimensions, rate: RateCard) {
  const billableKg = calculateBillableWeightKg(weightGram, dims)

  if (rate.maxKg && billableKg > rate.maxKg) {
    throw new Error(`Berat melebihi batas layanan ${rate.courier} ${rate.service}`)
  }

  if (billableKg <= rate.baseKg) {
    return rate.basePrice
  }

  return rate.basePrice + (billableKg - rate.baseKg) * rate.addlKgPrice
}

export function estimateShipping(options: {
  weightGram: number
  dims: Dimensions
  courier: string
  service: string
  rateCards?: RateCard[]
}) {
  const rate = (options.rateCards ?? DEFAULT_RATE_CARDS).find(
    (candidate) =>
      candidate.courier === options.courier && candidate.service === options.service
  )

  if (!rate) {
    throw new Error(`Rate untuk ${options.courier} ${options.service} tidak ditemukan`)
  }

  const billableWeightKg = calculateBillableWeightKg(options.weightGram, options.dims)
  const cost = calculateShipping(options.weightGram, options.dims, rate)

  return {
    cost,
    billableWeightKg,
    rate
  }
}
