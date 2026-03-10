import { useCallback } from 'react'

import { useWeb3React } from '@web3-react/core'
import { Contract } from 'ethers'

import { addressToBytes32 } from 'utils'
import { getTokenMessengerV2ContractAddress } from 'utils/addresses'

import type {
  TransactionResponse,
  Web3Provider,
} from '@ethersproject/providers'
import type { DestinationDomain, SupportedChainId } from 'constants/chains'
import type { BigNumber } from 'ethers'

interface TokenMessengerV2Contract {
  depositForBurn: (
    amount: BigNumber,
    destinationDomain: DestinationDomain,
    mintRecipient: string,
    burnToken: string,
    destinationCaller: string,
    maxFee: BigNumber | number,
    minFinalityThreshold: number,
    overrides?: TxOverrides
  ) => Promise<TransactionResponse>
}

interface TxOverrides {
  maxFeePerGas?: BigNumber
  maxPriorityFeePerGas?: BigNumber
}

/**
 * Returns a list of methods to call the Token Messenger contract
 * @param chainId the ID of the current connected chain/network
 */
const useTokenMessenger = (chainId: SupportedChainId | undefined) => {
  const { library } = useWeb3React<Web3Provider>()

  const TOKEN_MESSENGER_CONTRACT_ADDRESS =
    getTokenMessengerV2ContractAddress(chainId)

  // `0x00...00` leaves redeem callable by any address, matching prior app behavior.
  const NO_DESTINATION_CALLER =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

  /**
   * Returns transaction response from contract call
   * @param amount the amount to be deposit for burn on source chain
   * @param destinationDomain the Circle defined ID of target chain
   * @param mintRecipient the recipient address on target chain
   * @param burnToken the address of token to burn
   * @param maxFee max fee in USDC subunits; 0 = Standard Transfer, non-zero = Fast Transfer
   * @param minFinalityThreshold 1000 = Fast Transfer, 2000 = Standard Transfer
   */
  const depositForBurn = useCallback(
    async (
      amount: BigNumber,
      destinationDomain: DestinationDomain,
      mintRecipient: string,
      burnToken: string,
      maxFee: BigNumber | number = 0,
      minFinalityThreshold = 2000
    ) => {
      if (!library || TOKEN_MESSENGER_CONTRACT_ADDRESS === '') return
      const contract = new Contract(
        TOKEN_MESSENGER_CONTRACT_ADDRESS,
        [
          'function depositForBurn(uint256 amount,uint32 destinationDomain,bytes32 mintRecipient,address burnToken,bytes32 destinationCaller,uint256 maxFee,uint32 minFinalityThreshold) returns (uint64 nonce)',
        ],
        library.getSigner()
      ) as unknown as TokenMessengerV2Contract

      try {
        const feeData = await library.getFeeData()
        const gasOverrides: TxOverrides = {
          maxFeePerGas:
            feeData.maxFeePerGas != null
              ? feeData.maxFeePerGas.mul(12).div(10)
              : undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
        }

        return await contract.depositForBurn(
          amount,
          destinationDomain,
          addressToBytes32(mintRecipient),
          burnToken,
          NO_DESTINATION_CALLER,
          maxFee,
          minFinalityThreshold,
          gasOverrides
        )
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message)
        }
        throw error
      }
    },
    [TOKEN_MESSENGER_CONTRACT_ADDRESS, library]
  )

  return {
    depositForBurn,
  }
}

export default useTokenMessenger
