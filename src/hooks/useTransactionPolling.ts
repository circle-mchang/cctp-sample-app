import { useState } from 'react'

import { Chain, DestinationDomain } from 'constants/chains'
import {
  ARC_API_DELAY,
  DEFAULT_API_DELAY,
  DEFAULT_BLOCKCHAIN_DELAY,
} from 'constants/index'
import { TransactionStatus, useTransactionContext } from 'contexts/AppContext'
import { useQueryParam } from 'hooks/useQueryParam'
import useTransaction from 'hooks/useTransaction'
import {
  AttestationStatus,
  getAttestationByTransaction,
} from 'services/attestationService'

import type { Transaction } from 'contexts/AppContext'
import type { Bytes } from 'ethers'

export function useTransactionPolling(handleComplete: () => void) {
  const { getTransactionReceipt } = useTransaction()
  const { setTransaction } = useTransactionContext()
  const { txHash, transaction } = useQueryParam()
  const [signature, setSignature] = useState(transaction?.signature)

  const handleTransactionReceiptPolling = (
    handleSuccess: () => void,
    hash: string
  ) => {
    // Polling transaction receipt until status = 1
    const interval = setInterval(async () => {
      const transactionReceipt = await getTransactionReceipt(hash)
      if (transactionReceipt != null) {
        const { status } = transactionReceipt

        // Success
        if (status === 1) {
          clearInterval(interval)
          return handleSuccess()
        }
      }
    }, DEFAULT_BLOCKCHAIN_DELAY)

    return () => clearInterval(interval)
  }

  const handleApproveAllowanceTransactionReceiptPolling = (hash: string) => {
    if (hash) {
      const handleSuccess = () => {
        return handleComplete()
      }
      return handleTransactionReceiptPolling(handleSuccess, hash)
    }
  }

  const handleSendTransactionReceiptPolling = () => {
    if (transaction) {
      const handleSuccess = () => {
        const newTransaction: Transaction = {
          ...transaction,
          status: TransactionStatus.COMPLETE,
        }
        setTransaction(txHash, newTransaction)

        return handleAttestationPolling()
      }
      return handleTransactionReceiptPolling(handleSuccess, txHash)
    }
  }

  const handleRedeemTransactionReceiptPolling = () => {
    if (transaction) {
      const handleSuccess = () => {
        const newTransaction: Transaction = {
          ...transaction,
          status: TransactionStatus.COMPLETE,
        }
        setTransaction(txHash, newTransaction)

        return handleComplete()
      }
      return handleTransactionReceiptPolling(handleSuccess, txHash)
    }
  }

  const handleAttestationPolling = () => {
    if (txHash && transaction) {
      const attestationDelay =
        transaction.source === Chain.ARC ? ARC_API_DELAY : DEFAULT_API_DELAY
      let isAttestationRequestInFlight = false
      let isAttestationHandled = false
      // Polling transaction receipt until status = complete
      const interval = setInterval(async () => {
        if (isAttestationRequestInFlight || isAttestationHandled) {
          return
        }
        isAttestationRequestInFlight = true
        const sourceDomainId =
          DestinationDomain[
            transaction.source as keyof typeof DestinationDomain
          ]
        try {
          const attestation = await getAttestationByTransaction(
            sourceDomainId,
            txHash
          )
          if (attestation != null) {
            const { attestation: signature, message, status } = attestation

            // Success
            if (
              status === AttestationStatus.complete &&
              signature !== null &&
              message !== null &&
              !isAttestationHandled
            ) {
              isAttestationHandled = true
              const newTransaction: Transaction = {
                ...transaction,
                messageBytes: message as unknown as Bytes,
                signature,
              }
              setTransaction(txHash, newTransaction)
              setSignature(signature)

              handleComplete()
              clearInterval(interval)
            }
          }
        } finally {
          isAttestationRequestInFlight = false
        }
      }, attestationDelay)

      return () => clearInterval(interval)
    }
  }

  const handleApproveAllowanceTransactionPolling = (hash: string) => {
    return handleApproveAllowanceTransactionReceiptPolling(hash)
  }

  const handleSendTransactionPolling = () => {
    if (txHash && transaction?.status !== TransactionStatus.COMPLETE) {
      // Poll send transaction receipt for messageBytes and messageHash
      return handleSendTransactionReceiptPolling()
    } else if (
      txHash &&
      transaction?.status === TransactionStatus.COMPLETE &&
      !signature
    ) {
      // Poll attestation service for signature
      return handleAttestationPolling()
    }
  }

  const handleRedeemTransactionPolling = () => {
    // Poll redeem transaction receipt for completion
    if (
      txHash &&
      transaction &&
      transaction.status !== TransactionStatus.COMPLETE
    ) {
      return handleRedeemTransactionReceiptPolling()
    }
  }

  return {
    handleApproveAllowanceTransactionPolling,
    handleSendTransactionPolling,
    handleRedeemTransactionPolling,
  }
}
