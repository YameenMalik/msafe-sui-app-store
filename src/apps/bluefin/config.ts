// eslint-disable-next-line import/no-extraneous-dependencies
import { SuiClient } from '@firefly-exchange/library-sui';
// eslint-disable-next-line import/no-extraneous-dependencies
import { IBluefinSpotContracts, OnChainCalls } from '@firefly-exchange/library-sui/dist/src/spot';
import { WalletAccount } from '@mysten/wallet-standard';

import { SuiNetworks } from './types';

export const config = {
  rpc: 'https://fullnode.mainnet.sui.io/',
  objects: {
    GlobalConfig: '0x03db251ba509a8d5d8777b6338836082335d93eecbdd09a11e190a1cff51c352',
    BasePackage: '0x3492c874c1e3b3e2984e8c41b589e642d4d0a5d6459e5a9cfc2d52fd7c89c267',
    CurrentPackage: '0xa31282fc0a0ad50cf5f20908cfbb1539a143f5a38912eb8823a8dd6cbf98bc44',
  } as any as IBluefinSpotContracts,
};

export const getBluefinSpotSDK = (network: SuiNetworks, account: WalletAccount) => {
  if (network !== 'sui:mainnet') {
    throw new Error('Bluefin spot protocol is only available on sui::mainnet');
  }

  const client = new SuiClient({ url: config.rpc });

  const spotSDK = new OnChainCalls(client, config.objects, { address: account.address, isUIWallet: false });

  return spotSDK;
};
