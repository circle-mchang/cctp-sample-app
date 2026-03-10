import { useEffect, useState } from 'react'

import { BigNumber } from 'ethers'

import { DestinationDomain } from 'constants/chains'
import { getFastTransferFee } from 'services/feeService'

import type { Chain } from 'constants/chains'

interface FastTransferFeeResult {
  fastFee: BigNumber | null
  loading: boolean
}

/**
 * Fetches the minimum fast-transfer fee (with 20% buffer) from the Iris API
 * for the given source → target chain pair.
 *
 * Returns `fastFee = null` while loading or if the route does not support
 * Fast Transfer. Callers should disable Fast Transfer when `fastFee` is null.
 */
const useFastTransferFee = (
  source: Chain,
  target: Chain
): FastTransferFeeResult => {
  const [fastFee, setFastFee] = useState<BigNumber | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFastFee(null)

    const sourceDomainId =
      DestinationDomain[source as keyof typeof DestinationDomain]
    const destDomainId =
      DestinationDomain[target as keyof typeof DestinationDomain]

    const fetchFee = async () => {
      const fee = await getFastTransferFee(sourceDomainId, destDomainId)
      if (cancelled) return
      setFastFee(fee != null ? BigNumber.from(fee) : null)
      setLoading(false)
    }

    void fetchFee()

    return () => {
      cancelled = true
    }
  }, [source, target])

  return { fastFee, loading }
}

export default useFastTransferFee
