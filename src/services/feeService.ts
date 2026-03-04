import axios from 'axios'

import { IRIS_ATTESTATION_API_URL } from 'constants/index'

import type { AxiosInstance } from 'axios'

const FAST_FINALITY_THRESHOLD = 1000

interface FeeEntry {
  finalityThreshold: number
  minimumFee: number
  forwardFee: {
    low: number
    med: number
    high: number
  }
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: `${IRIS_ATTESTATION_API_URL}/v2/burn/USDC/fees`,
})

/**
 * Returns the maximum fee (in USDC subunits) to pass as `maxFee` when
 * calling `depositForBurn` for a Fast Transfer. Adds a 20% buffer over
 * the minimum fast-transfer fee to avoid reverts due to fee fluctuations.
 *
 * Returns `null` if the route does not support Fast Transfer or the API
 * call fails.
 */
export const getFastTransferFee = async (
  sourceDomainId: number,
  destDomainId: number
): Promise<bigint | null> => {
  try {
    const response = await axiosInstance.get<FeeEntry[]>(
      `/${sourceDomainId}/${destDomainId}`
    )
    const entries = response.data ?? []
    const fastEntry = entries.find(
      (e) => e.finalityThreshold === FAST_FINALITY_THRESHOLD
    )
    if (fastEntry == null) return null

    // minimumFee is in basis points. Convert bps fee to subunits:
    // fee_subunits = (minimumFee_bps / 10000) * 1_000_000, with 20% buffer.
    // Use forwardFee.med (absolute subunit amount) if available, else derive from bps.
    const absoluteFee = fastEntry.forwardFee?.med ?? 0
    if (absoluteFee > 0) {
      // Add 20% buffer
      return BigInt(Math.ceil(absoluteFee * 1.2))
    }

    // Fallback: use minimumFee in bps — caller must supply amount context.
    // We return null so caller falls back to standard transfer.
    return null
  } catch {
    return null
  }
}
