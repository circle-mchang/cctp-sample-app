import { useCallback } from 'react'

import { useWeb3React } from '@web3-react/core'

import { MessageTransmitterV2__factory } from 'typechain/index'
import { getMessageTransmitterV2ContractAddress } from 'utils/addresses'

import type {
  TransactionResponse,
  Web3Provider,
} from '@ethersproject/providers'
import type { SupportedChainId } from 'constants/chains'
import type { BigNumber, Bytes } from 'ethers'

interface TxOverrides {
  maxFeePerGas?: BigNumber
  maxPriorityFeePerGas?: BigNumber
}

/**
 * Returns a list of methods to call the MessageTransmitter V2 contract
 * @param chainId the ID of the current connected chain/network
 */
const useMessageTransmitter = (chainId: SupportedChainId | undefined) => {
  const { library } = useWeb3React<Web3Provider>()

  const MESSAGE_TRANSMITTER_CONTRACT_ADDRESS =
    getMessageTransmitterV2ContractAddress(chainId)

  /**
   * Returns transaction response from contract call
   * @param message the message bytes from the source chain depositForBurn transaction
   * @param signature the signature returned from attestation service by messageHash
   */
  const receiveMessage = useCallback(
    async (message: Bytes, signature: string) => {
      if (!library || MESSAGE_TRANSMITTER_CONTRACT_ADDRESS === '') return
      const contract = MessageTransmitterV2__factory.connect(
        MESSAGE_TRANSMITTER_CONTRACT_ADDRESS,
        library.getSigner()
      )
      const feeData = await library.getFeeData()
      const gasOverrides: TxOverrides = {
        maxFeePerGas:
          feeData.maxFeePerGas != null
            ? feeData.maxFeePerGas.mul(12).div(10)
            : undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
      }

      return await contract
        .receiveMessage(message, signature, gasOverrides)
        .then((response: TransactionResponse) => {
          return response
        })
        .catch((error: Error) => {
          throw new Error(error.message)
        })
    },
    [MESSAGE_TRANSMITTER_CONTRACT_ADDRESS, library]
  )

  return {
    receiveMessage,
  }
}

export default useMessageTransmitter
