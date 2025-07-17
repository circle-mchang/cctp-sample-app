// General errors: https://eips.ethereum.org/EIPS/eip-1193#provider-errors

export const enum WalletProviderError {
  CHAIN_NOT_ADDED = 4902,
  USER_REJECTED = 4001,
  UNAUTHORIZED = 4100,
  UNSUPPORTED_METHOD = 4200,
  DISCONNECTED = 4900,
  CHAIN_DISCONNECTED = 4901,
}

export const getErrorMessage = (code: number): string => {
  switch (code) {
    case WalletProviderError.CHAIN_NOT_ADDED:
      return 'Network not added to wallet. Adding network...'
    case WalletProviderError.USER_REJECTED:
      return 'User rejected the network switch request.'
    case WalletProviderError.UNAUTHORIZED:
      return 'Not authorized to perform this action.'
    case WalletProviderError.UNSUPPORTED_METHOD:
      return 'Method not supported by wallet.'
    case WalletProviderError.DISCONNECTED:
      return 'Wallet is disconnected.'
    case WalletProviderError.CHAIN_DISCONNECTED:
      return 'Network is disconnected.'
    default:
      return 'An unknown error occurred.'
  }
}
