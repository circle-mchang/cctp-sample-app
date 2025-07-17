import { useState } from 'react'
import { useWeb3React } from '@web3-react/core'

import {
  CHAIN_ID_HEXES_TO_PARAMETERS,
  CHAIN_TO_CHAIN_ID,
  Chain,
  SupportedChainId,
  DestinationDomain,
} from 'constants/chains'
import { WalletProviderError, getErrorMessage } from 'constants/errors'
import { numToHex, validateChainParameters } from 'utils'

import type { Web3Provider } from '@ethersproject/providers'

// https://eips.ethereum.org/EIPS/eip-1193#errors
interface ProviderRpcError extends Error {
  message: string
  code: number
  data?: unknown
}

interface SwitchNetworkResult {
  success: boolean
  error?: string
  isLoading: boolean
}

/**
 * Test helper to verify ARB to AVAX flow configuration
 */
export const testArbToAvaxFlow = () => {
  // eslint-disable-next-line no-console
  console.log('[testArbToAvaxFlow] Testing ARB to AVAX flow configuration...')
  
  const arbChainId = CHAIN_TO_CHAIN_ID[Chain.ARB]
  const avaxChainId = CHAIN_TO_CHAIN_ID[Chain.AVAX]
  const arbDestinationDomain = DestinationDomain.ARB
  const avaxDestinationDomain = DestinationDomain.AVAX
  
  // eslint-disable-next-line no-console
  console.log('[testArbToAvaxFlow] Chain IDs:', {
    ARB_SEPOLIA: arbChainId,
    AVAX_FUJI: avaxChainId,
  })
  
  // eslint-disable-next-line no-console
  console.log('[testArbToAvaxFlow] Destination Domains:', {
    ARB: arbDestinationDomain,
    AVAX: avaxDestinationDomain,
  })
  
  const arbHexChainId = numToHex(arbChainId)
  const avaxHexChainId = numToHex(avaxChainId)
  
  // eslint-disable-next-line no-console
  console.log('[testArbToAvaxFlow] Hex Chain IDs:', {
    ARB_SEPOLIA: arbHexChainId,
    AVAX_FUJI: avaxHexChainId,
  })
  
  const arbChainParams = CHAIN_ID_HEXES_TO_PARAMETERS[arbHexChainId]
  const avaxChainParams = CHAIN_ID_HEXES_TO_PARAMETERS[avaxHexChainId]
  
  // eslint-disable-next-line no-console
  console.log('[testArbToAvaxFlow] Chain Parameters:', {
    ARB_SEPOLIA: arbChainParams,
    AVAX_FUJI: avaxChainParams,
  })
  
  // eslint-disable-next-line no-console
  console.log('[testArbToAvaxFlow] Parameter Validation:', {
    ARB_SEPOLIA_VALID: validateChainParameters(arbChainParams),
    AVAX_FUJI_VALID: validateChainParameters(avaxChainParams),
  })
  
  // Test the expected flow
  // eslint-disable-next-line no-console
  console.log('[testArbToAvaxFlow] Expected flow:')
  // eslint-disable-next-line no-console
  console.log('1. User starts on ARB_SEPOLIA (421614)')
  // eslint-disable-next-line no-console
  console.log('2. User sends USDC with destination domain AVAX (1)')
  // eslint-disable-next-line no-console
  console.log('3. User switches to AVAX_FUJI (43113) for redeem')
  // eslint-disable-next-line no-console
  console.log('4. User completes redeem transaction')
  
  return {
    arbChainId,
    avaxChainId,
    arbDestinationDomain,
    avaxDestinationDomain,
    arbChainParams,
    avaxChainParams,
    configValid: validateChainParameters(arbChainParams) && validateChainParameters(avaxChainParams),
  }
}

const useSwitchNetwork = (chain: string) => {
  const { library, chainId } = useWeb3React<Web3Provider>()
  const [switchResult, setSwitchResult] = useState<SwitchNetworkResult>({
    success: false,
    isLoading: false,
  })

  const switchNetwork = async (): Promise<SwitchNetworkResult> => {
    // eslint-disable-next-line no-console
    console.log(`[useSwitchNetwork] Attempting to switch to ${chain}`, {
      currentChainId: chainId,
      targetChainId: CHAIN_TO_CHAIN_ID[chain],
      hasProvider: !!library?.provider?.request,
    })

    // Special logging for ARB to AVAX flow
    if (chain === Chain.AVAX && chainId === SupportedChainId.ARB_SEPOLIA) {
      // eslint-disable-next-line no-console
      console.log('[useSwitchNetwork] ARB to AVAX flow detected!')
      testArbToAvaxFlow()
    }

    setSwitchResult({ success: false, isLoading: true })

    // Check if provider is available
    if (library?.provider?.request == null) {
      const error = 'Web3 provider not available. Please connect your wallet.'
      // eslint-disable-next-line no-console
      console.error('[useSwitchNetwork] No provider available')
      setSwitchResult({ success: false, error, isLoading: false })
      return { success: false, error, isLoading: false }
    }

    if (chainId !== null && chainId !== undefined) {
      const switchChainId = CHAIN_TO_CHAIN_ID[chain]
      
      // Check if chain is supported
      if (switchChainId === undefined || switchChainId === null) {
        const error = `Chain ${chain} is not supported.`
        // eslint-disable-next-line no-console
        console.error(`[useSwitchNetwork] Chain ${chain} not supported`)
        setSwitchResult({ success: false, error, isLoading: false })
        return { success: false, error, isLoading: false }
      }

      // only attempt to switch if the state is mismatched
      if (chainId !== switchChainId) {
        const hexChainId = numToHex(CHAIN_TO_CHAIN_ID[chain])
        // eslint-disable-next-line no-console
        console.log(`[useSwitchNetwork] Switching to chain ${chain} (${hexChainId})`)
        
        try {
          await library.provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChainId }],
          })
          
          // eslint-disable-next-line no-console
          console.log(`[useSwitchNetwork] Successfully switched to ${chain}`)
          setSwitchResult({ success: true, isLoading: false })
          return { success: true, isLoading: false }
        } catch (error) {
          const switchError = error as ProviderRpcError
          // eslint-disable-next-line no-console
          console.log(`[useSwitchNetwork] Switch failed with code ${switchError.code}:`, switchError.message)
          
          if (switchError.code === WalletProviderError.CHAIN_NOT_ADDED) {
            try {
              const chainParams = CHAIN_ID_HEXES_TO_PARAMETERS[hexChainId]
              // eslint-disable-next-line no-console
              console.log(`[useSwitchNetwork] Adding chain ${chain} to wallet`, chainParams)
              
              // Validate chain parameters before adding
              if (!validateChainParameters(chainParams)) {
                const errorMessage = `Invalid chain parameters for ${chain}. Please check the configuration.`
                // eslint-disable-next-line no-console
                console.error(`[useSwitchNetwork] Invalid chain parameters for ${chain}`)
                setSwitchResult({ success: false, error: errorMessage, isLoading: false })
                return { success: false, error: errorMessage, isLoading: false }
              }
              
              await library.provider.request({
                method: 'wallet_addEthereumChain',
                params: [chainParams],
              })
              
              // eslint-disable-next-line no-console
              console.log(`[useSwitchNetwork] Successfully added and switched to ${chain}`)
              setSwitchResult({ success: true, isLoading: false })
              return { success: true, isLoading: false }
            } catch (addError) {
              const addErrorMsg = addError instanceof Error ? addError.message : 'Failed to add network'
              const errorMessage = `Failed to add ${chain} network: ${addErrorMsg}`
              // eslint-disable-next-line no-console
              console.error(`[useSwitchNetwork] Failed to add ${chain}:`, addError)
              setSwitchResult({ success: false, error: errorMessage, isLoading: false })
              return { success: false, error: errorMessage, isLoading: false }
            }
          } else {
            const errorMessage = getErrorMessage(switchError.code) || `Failed to switch to ${chain}: ${switchError.message}`
            // eslint-disable-next-line no-console
            console.error(`[useSwitchNetwork] Failed to switch to ${chain}:`, switchError)
            setSwitchResult({ success: false, error: errorMessage, isLoading: false })
            return { success: false, error: errorMessage, isLoading: false }
          }
        }
      } else {
        // Already on the correct network
        // eslint-disable-next-line no-console
        console.log(`[useSwitchNetwork] Already on ${chain}`)
        setSwitchResult({ success: true, isLoading: false })
        return { success: true, isLoading: false }
      }
    }

    const error = 'Unable to determine current network.'
    // eslint-disable-next-line no-console
    console.error('[useSwitchNetwork] Unable to determine current network')
    setSwitchResult({ success: false, error, isLoading: false })
    return { success: false, error, isLoading: false }
  }

  return { switchNetwork, switchResult }
}

export default useSwitchNetwork
