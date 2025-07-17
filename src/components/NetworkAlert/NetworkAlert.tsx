import { Alert, Button, CircularProgress, Snackbar } from '@mui/material'
import { useWeb3React } from '@web3-react/core'
import { useEffect, useState } from 'react'

import { CHAIN_TO_CHAIN_ID } from 'constants/chains'
import useSwitchNetwork from 'hooks/useSwitchNetwork'

import type { Web3Provider } from '@ethersproject/providers'

interface Props {
  chain: string
  className?: string
}

const NetworkAlert: React.FC<Props> = ({ chain, className }) => {
  const { chainId } = useWeb3React<Web3Provider>()
  const { switchNetwork, switchResult } = useSwitchNetwork(chain)
  const [showErrorSnackbar, setShowErrorSnackbar] = useState(false)

  const handleSwitchNetwork = async () => {
    const result = await switchNetwork()
    if (!result.success && result.error) {
      setShowErrorSnackbar(true)
    }
  }

  useEffect(() => {
    if (switchResult.error) {
      setShowErrorSnackbar(true)
    }
  }, [switchResult.error])

  if (chainId != null && CHAIN_TO_CHAIN_ID[chain] !== chainId) {
    return (
      <>
        <Alert
          className={className}
          severity="error"
          action={
            <Button
              size="small"
              onClick={handleSwitchNetwork}
              disabled={switchResult.isLoading}
              startIcon={switchResult.isLoading ? <CircularProgress size={16} /> : undefined}
            >
              {switchResult.isLoading ? 'Switching...' : 'Switch'}
            </Button>
          }
        >
          Source chain and selected network in wallet must be the same
        </Alert>
        
        <Snackbar
          open={showErrorSnackbar}
          autoHideDuration={6000}
          onClose={() => setShowErrorSnackbar(false)}
          message={switchResult.error}
        />
      </>
    )
  }
  return null
}

export default NetworkAlert
