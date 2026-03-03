import { InjectedConnector } from '@web3-react/injected-connector'

export const injected = new InjectedConnector({
  // Allow wallet connection on any chain; flow-level checks still enforce supported testnets.
})
