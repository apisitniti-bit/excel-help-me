import type { IdGenerationError } from "@/types"

export function validateIdConfig(
  prefix: string,
  totalLength: number,
  startNumber: number,
  count: number
): IdGenerationError | null {
  if (prefix.length >= totalLength) {
    return {
      type: "prefix_too_long",
      message: `Prefix length (${prefix.length}) must be less than total ID length (${totalLength}).`,
    }
  }

  const variableLength = totalLength - prefix.length
  const maxValue = Math.pow(10, variableLength) - 1

  if (startNumber < 0) {
    return {
      type: "overflow",
      message: `Starting number cannot be negative.`,
    }
  }

  if (startNumber + count - 1 > maxValue) {
    return {
      type: "overflow",
      message: `Cannot generate ${count} IDs starting from ${startNumber}. Maximum value for ${variableLength} digits is ${maxValue}.`,
    }
  }

  return null
}

export function generateIds(
  prefix: string,
  totalLength: number,
  startNumber: number,
  count: number
): string[] {
  const error = validateIdConfig(prefix, totalLength, startNumber, count)
  if (error) {
    throw new Error(error.message)
  }

  const variableLength = totalLength - prefix.length
  const ids: string[] = []
  const seen = new Set<string>()

  for (let i = 0; i < count; i++) {
    const num = startNumber + i
    const id = prefix + String(num).padStart(variableLength, "0")
    if (seen.has(id)) {
      throw new Error(`Duplicate ID generated: ${id}`)
    }
    seen.add(id)
    ids.push(id)
  }

  return ids
}
