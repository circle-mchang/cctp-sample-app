import axios from 'axios'

import { IRIS_ATTESTATION_API_URL } from 'constants/index'

import type { AxiosInstance } from 'axios'

export enum AttestationStatus {
  complete = 'complete',
  pending = 'pending',
  pending_confirmations = 'pending_confirmations',
}

export interface Attestation {
  attestation: string | null
  message: string | null
  status: AttestationStatus
}

interface V2Message {
  attestation?: string | null
  message?: string | null
  status?: string
}

interface V2MessagesResponse {
  messages?: V2Message[]
}

const mapStatus = (status?: string): AttestationStatus => {
  if (status === AttestationStatus.complete) {
    return AttestationStatus.complete
  }
  if (status === AttestationStatus.pending_confirmations) {
    return AttestationStatus.pending_confirmations
  }
  return AttestationStatus.pending
}

const mapAttestationV2 = (data: V2MessagesResponse): Attestation => {
  const messages = data.messages ?? []
  const completedMessage = messages.find(
    (message) =>
      message.status === AttestationStatus.complete &&
      message.attestation != null
  )
  const selectedMessage = completedMessage ?? messages[0]

  if (selectedMessage == null) {
    return {
      attestation: null,
      message: null,
      status: AttestationStatus.pending,
    }
  }

  return {
    attestation: selectedMessage.attestation ?? null,
    message: selectedMessage.message ?? null,
    status: mapStatus(selectedMessage.status),
  }
}

// CCTP V2 uses `/v2/messages/{sourceDomainId}?transactionHash={txHash}`.
const baseURL = `${IRIS_ATTESTATION_API_URL}/v2/messages`
const axiosInstance: AxiosInstance = axios.create({ baseURL })

export const getAttestationByTransaction = async (
  sourceDomainId: number,
  transactionHash: string
): Promise<Attestation | null> => {
  try {
    const response = await axiosInstance.get<V2MessagesResponse>(
      `/${sourceDomainId}`,
      {
        params: {
          transactionHash,
        },
      }
    )
    return mapAttestationV2(response?.data)
  } catch (error) {
    // Treat 404 as pending and keep polling
    if (axios.isAxiosError(error) && error?.response?.status === 404) {
      return {
        attestation: null,
        message: null,
        status: AttestationStatus.pending,
      }
    }
    console.error(error)
    return null
  }
}
