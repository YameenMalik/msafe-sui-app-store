import { TransactionType } from '@msafe/sui3-utils';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { WalletAccount } from '@mysten/wallet-standard';

import { BaseIntention } from '@/apps/interface/sui';
import { SuiNetworks } from '@/types';

import { TransactionSubType } from '../types';
import { RepayIntentionData, getRepayTx } from '../api/lending';

export class RepayIntention extends BaseIntention<RepayIntentionData> {
  txType = TransactionType.Other;

  txSubType = TransactionSubType.Repay;

  constructor(public readonly data: RepayIntentionData) {
    super(data);
  }

  async build(input: { network: SuiNetworks; suiClient: SuiClient; account: WalletAccount }): Promise<Transaction> {
    const { account, network } = input;
    const tx = await getRepayTx(this.data, account, network);
    return tx;
  }

  static fromData(data: RepayIntentionData) {
    return new RepayIntention(data);
  }
}