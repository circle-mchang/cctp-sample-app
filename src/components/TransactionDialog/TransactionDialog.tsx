import { useEffect, useMemo } from 'react'

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EastIcon from '@mui/icons-material/East'
import {
  Button,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

import { CHAIN_ICONS } from 'assets/chains'
import { CHAIN_TO_EXPLORER_URL } from 'constants/chains'
import { TransactionType } from 'contexts/AppContext'
import { useBeforeUnload } from 'hooks/useBeforeUnload'
import { copyToClipboard } from 'utils'

import styles from './TransactionDialog.module.css'

import type { SxProps } from '@mui/material'
import type { Chain } from 'constants/chains'
import type { Transaction } from 'contexts/AppContext'

interface Props {
  handleTransactionPolling: () => void
  open: boolean
  transaction: Transaction
  isComplete?: boolean
  onContinue?: () => void
  sx?: SxProps
}

const TransactionDialog: React.FC<Props> = ({
  handleTransactionPolling,
  open,
  transaction,
  isComplete = false,
  onContinue,
  sx = {},
}) => {
  useBeforeUnload((event: BeforeUnloadEvent) => {
    event.preventDefault()
    event.returnValue = ''
  })

  useEffect(() => {
    return handleTransactionPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chainIcons = useMemo(() => {
    const source = CHAIN_ICONS[transaction.source as Chain]
    const target = CHAIN_ICONS[transaction.target as Chain]
    return { source, target }
  }, [transaction])

  const explorerUrl = useMemo(() => {
    const chain =
      transaction.type === TransactionType.REDEEM
        ? transaction.target
        : transaction.source
    const base = CHAIN_TO_EXPLORER_URL[chain] ?? ''
    return `${base}/tx/${transaction.hash}`
  }, [transaction])

  const shortHash = `${transaction.hash.slice(
    0,
    10
  )}...${transaction.hash.slice(-8)}`

  const copyUrl = () => copyToClipboard(window.location.href)

  return (
    <Dialog
      fullScreen={true}
      open={open}
      sx={sx}
      classes={{ paper: styles.aurora }}
    >
      {isComplete ? (
        <>
          <DialogTitle className="flex items-center gap-4 text-5xl">
            <CheckCircleOutlineIcon sx={{ fontSize: 56 }} color="success" />
            Transaction Successful
          </DialogTitle>
          <DialogContentText className="text-xl">
            Your transaction has been confirmed on-chain.
          </DialogContentText>
          <DialogContent className="mb-20 flex-initial text-center">
            <div className="flex items-center justify-center">
              <img
                className="h-24"
                src={chainIcons.source}
                alt={transaction.source}
              />
              <EastIcon className="mx-8" sx={{ fontSize: 60 }} />
              <img
                className="h-24"
                src={chainIcons.target}
                alt={transaction.target}
              />
            </div>
            <div className="mt-12">
              <p className="text-lg">Transaction hash</p>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono mt-2 inline-block text-base underline"
              >
                {shortHash} ↗
              </a>
            </div>
            {onContinue && (
              <Button
                className="mt-16"
                size="large"
                variant="contained"
                onClick={onContinue}
              >
                {transaction.type === TransactionType.REDEEM
                  ? 'DONE'
                  : 'CONTINUE TO RECEIVE'}
              </Button>
            )}
          </DialogContent>
        </>
      ) : (
        <>
          <DialogTitle className="text-7xl">Transferring...</DialogTitle>
          <DialogContentText className="text-xl">
            Please do not close your browser window. This may take a few minutes
            to complete.
          </DialogContentText>
          <DialogContent className="mb-20 flex-initial text-center">
            <div className="flex items-center justify-center">
              <img
                className="h-24"
                src={chainIcons.source}
                alt={transaction.source}
              />
              <EastIcon className="mx-8" sx={{ fontSize: 60 }} />
              <img
                className="h-24"
                src={chainIcons.target}
                alt={transaction.target}
              />
            </div>
            <div className="mt-20">
              <p>Save this URL in case something goes wrong</p>
              <Button variant="text" onClick={copyUrl}>
                Copy to clipboard
                <ContentCopyIcon className="ml-2" />
              </Button>
            </div>
          </DialogContent>
        </>
      )}
    </Dialog>
  )
}

export default TransactionDialog
