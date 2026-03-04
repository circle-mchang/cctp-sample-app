import { useEffect, useState } from 'react'

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CloseIcon from '@mui/icons-material/Close'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import SendIcon from '@mui/icons-material/Send'
import { LoadingButton } from '@mui/lab'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material'
import { useWeb3React } from '@web3-react/core'
import { parseUnits } from 'ethers/lib/utils'

import NetworkAlert from 'components/NetworkAlert/NetworkAlert'
import TransactionDetails from 'components/TransactionDetails/TransactionDetails'
import { CHAIN_TO_CHAIN_ID, DestinationDomain } from 'constants/chains'
import { DEFAULT_DECIMALS } from 'constants/tokens'
import {
  TransactionStatus,
  TransactionType,
  useTransactionContext,
} from 'contexts/AppContext'
import useTokenAllowance from 'hooks/useTokenAllowance'
import useTokenApproval from 'hooks/useTokenApproval'
import useTokenMessenger from 'hooks/useTokenMessenger'
import { useTransactionPolling } from 'hooks/useTransactionPolling'
import {
  getTokenMessengerV2ContractAddress,
  getUSDCContractAddress,
} from 'utils/addresses'

import type { Web3Provider } from '@ethersproject/providers'
import type { SxProps } from '@mui/material'
import type { Chain } from 'constants/chains'
import type { TransactionInputs } from 'contexts/AppContext'
import type { BigNumber } from 'ethers'

interface Props {
  handleClose: () => void
  handleNext: (hash: string) => void
  open: boolean
  formInputs: TransactionInputs
  sx?: SxProps
}

const STEPS = ['Approve Spending Cap', 'Send Transfer']

const SendConfirmationDialog: React.FC<Props> = ({
  handleClose,
  handleNext,
  open,
  formInputs,
  sx = {},
}) => {
  const { account, active, chainId } = useWeb3React<Web3Provider>()
  const { target, address, amount } = formInputs
  const [isAllowanceSufficient, setIsAllowanceSufficient] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const USDC_ADDRESS = getUSDCContractAddress(chainId)
  const TOKEN_MESSENGER_V2_ADDRESS = getTokenMessengerV2ContractAddress(chainId)

  const { approve } = useTokenApproval(USDC_ADDRESS, TOKEN_MESSENGER_V2_ADDRESS)
  const { depositForBurn } = useTokenMessenger(chainId)
  const allowance = useTokenAllowance(
    USDC_ADDRESS,
    account ?? '',
    TOKEN_MESSENGER_V2_ADDRESS
  )
  const { addTransaction } = useTransactionContext()

  useEffect(() => {
    if (!account || !active || !amount) return

    // amount <= allowance, sufficient
    setIsAllowanceSufficient(
      parseUnits(amount ?? 0, DEFAULT_DECIMALS).lte(allowance)
    )
  }, [account, active, allowance, amount])

  const handleApproveComplete = () => {
    setIsApproving(false)
    setIsAllowanceSufficient(true)
  }

  const { handleApproveAllowanceTransactionPolling } = useTransactionPolling(
    handleApproveComplete
  )

  const handleApprove = async () => {
    const amountToApprove: BigNumber = parseUnits(
      amount.toString(),
      DEFAULT_DECIMALS
    )
    if (amountToApprove.gt(0)) {
      setIsApproving(true)
      try {
        const response = await approve(amountToApprove)
        if (!response) return

        const { hash } = response.response
        return handleApproveAllowanceTransactionPolling(hash)
      } catch (err) {
        console.error(err)
        setIsApproving(false)
      }
    }
  }

  const handleSend = async () => {
    const amountToSend: BigNumber = parseUnits(
      amount.toString(),
      DEFAULT_DECIMALS
    )

    setIsSending(true)
    try {
      const response = await depositForBurn(
        amountToSend,
        DestinationDomain[target as Chain],
        address,
        USDC_ADDRESS
      )
      if (!response) return

      const { hash } = response

      const transaction = {
        ...formInputs,
        hash,
        type: TransactionType.SEND,
        status: TransactionStatus.PENDING,
      }

      addTransaction(hash, transaction)

      handleNext(hash)
      setIsSending(false)
    } catch (err) {
      console.error(err)
      setIsSending(false)
    }
  }

  const activeStep = isAllowanceSufficient ? 1 : 0
  const isWrongNetwork = CHAIN_TO_CHAIN_ID[formInputs.source] !== chainId

  return (
    <Dialog
      maxWidth="md"
      fullWidth={true}
      onClose={handleClose}
      open={open}
      sx={sx}
    >
      <DialogTitle>Confirm Transfer</DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} className="mb-8">
          {STEPS.map((label, index) => (
            <Step key={label} completed={index < activeStep}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {!isAllowanceSufficient ? (
          <Alert severity="info" icon={<LockOpenIcon />} className="mb-6">
            <strong>Step 1 of 2 — Approve Spending Cap</strong>
            <br />
            You must authorize the CCTP contract to spend{' '}
            <strong>{amount} USDC</strong> on your behalf. Your wallet will ask
            you to set a spending cap — enter at least{' '}
            <strong>{amount} USDC</strong> and confirm.
            {isApproving && (
              <span className="mt-2 block text-sm opacity-75">
                Waiting for approval confirmation on-chain…
              </span>
            )}
          </Alert>
        ) : (
          <Alert
            severity="success"
            icon={<CheckCircleOutlineIcon />}
            className="mb-6"
          >
            <strong>Step 1 complete — Spending cap approved</strong>
            <br />
            Your USDC spending cap is set. Click <strong>SEND</strong> below to
            initiate the cross-chain transfer.
          </Alert>
        )}

        <TransactionDetails transaction={formInputs} />

        <NetworkAlert className="mt-8" chain={formInputs.source} />
      </DialogContent>

      <DialogActions className="mt-8">
        <Button size="large" color="secondary" onClick={handleClose}>
          BACK
        </Button>
        {!isAllowanceSufficient ? (
          <LoadingButton
            size="large"
            startIcon={<LockOpenIcon />}
            onClick={handleApprove}
            disabled={isApproving || isWrongNetwork}
            loading={isApproving}
            loadingPosition="start"
          >
            APPROVE SPENDING CAP
          </LoadingButton>
        ) : (
          <LoadingButton
            size="large"
            startIcon={<SendIcon />}
            onClick={handleSend}
            disabled={isSending || isWrongNetwork}
            loading={isSending}
            loadingPosition="start"
          >
            SEND
          </LoadingButton>
        )}
      </DialogActions>

      <IconButton className="absolute right-3 top-3" onClick={handleClose}>
        <CloseIcon />
      </IconButton>
    </Dialog>
  )
}

export default SendConfirmationDialog
