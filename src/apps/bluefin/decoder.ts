import { asIntN } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { TransactionType } from '@msafe/sui3-utils';
import { fromB64 } from '@mysten/bcs';
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';

import { DecodeResult, RewardCollection, TransactionSubType } from './types';

export class Decoder {
  constructor(public readonly transaction: Transaction) {}

  decode() {
    if (this.isOpenPositionTx()) {
      return this.decodeOpenPositionAndAddLiquidityTx();
    }
    if (this.isProvideLiquidityTx()) {
      return this.decodeProvideLiquidityTx();
    }
    if (this.isRemoveLiquidityTx()) {
      return this.decodeRemoveLiquidityTx();
    }
    if (this.isCollectRewardsTx()) {
      return this.decodeCollectRewardsTx();
    }
    if (this.isCollectFeeTx()) {
      return this.decodeCollectFeeTx();
    }
    throw new Error(`Unknown transaction type`);
  }

  private decodeOpenPositionAndAddLiquidityTx(): DecodeResult {
    const openPosCommand = this.getMoveCallCommand('open_position');
    const addLiqCommand = this.getMoveCallCommand('provide_liquidity_with_fixed_amount');

    return {
      txType: TransactionType.Other,
      type: TransactionSubType.OpenAndAddLiquidity,
      intentionData: {
        pool: this.getObjectID(this.getInputIndex(openPosCommand, 1)),
        lowerTick: Number(asIntN(BigInt(this.getU32(this.getInputIndex(openPosCommand, 2)))).toString()),
        upperTick: Number(asIntN(BigInt(this.getU32(this.getInputIndex(openPosCommand, 3)))).toString()),
        tokenAmount: this.getU64(this.getInputIndex(addLiqCommand, 6)),
        maxAmountTokenA: this.getU64(this.getInputIndex(addLiqCommand, 7)),
        maxAmountTokenB: this.getU64(this.getInputIndex(addLiqCommand, 8)),
        isTokenAFixed: this.getBoolean(this.getInputIndex(addLiqCommand, 9)),
      },
    };
  }

  private decodeProvideLiquidityTx(): DecodeResult {
    const addLiqCommand = this.getMoveCallCommand('provide_liquidity_with_fixed_amount');

    return {
      txType: TransactionType.Other,
      type: TransactionSubType.ProvideLiquidity,
      intentionData: {
        pool: this.getObjectID(this.getInputIndex(addLiqCommand, 2)),
        position: this.getObjectID(this.getInputIndex(addLiqCommand, 3)),
        tokenAmount: this.getU64(this.getInputIndex(addLiqCommand, 6)),
        maxAmountTokenA: this.getU64(this.getInputIndex(addLiqCommand, 7)),
        maxAmountTokenB: this.getU64(this.getInputIndex(addLiqCommand, 8)),
        isTokenAFixed: this.getBoolean(this.getInputIndex(addLiqCommand, 9)),
        collectRewards: this.getCollectRewardCalls(),
      },
    };
  }

  private decodeRemoveLiquidityTx(): DecodeResult {
    const removeLiqCommand = this.getMoveCallCommand('remove_liquidity');
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.RemoveLiquidity,
      intentionData: {
        pool: this.getObjectID(this.getInputIndex(removeLiqCommand, 2)),
        position: this.getObjectID(this.getInputIndex(removeLiqCommand, 3)),
        liquidity: this.getU128(this.getInputIndex(removeLiqCommand, 4)),
        maxAmountTokenA: this.getU64(this.getInputIndex(removeLiqCommand, 5)),
        maxAmountTokenB: this.getU64(this.getInputIndex(removeLiqCommand, 6)),
        transferTokensTo: this.getAddress(this.getInputIndex(removeLiqCommand, 7)),
        collectRewards: this.getCollectRewardCalls(),
      },
    };
  }

  private decodeCollectRewardsTx(): DecodeResult {
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.CollectRewards,
      intentionData: {
        collectRewards: this.getCollectRewardCalls(),
      },
    };
  }

  private decodeCollectFeeTx(): DecodeResult {
    return {
      txType: TransactionType.Other,
      type: TransactionSubType.CollectFee,
      intentionData: {
        collectRewards: this.getCollectRewardCalls(),
      },
    };
  }

  private getCollectRewardCalls(): Array<RewardCollection> {
    const collectRewards: RewardCollection[] = [];

    this.commands.forEach((command) => {
      if (command.$kind === 'MoveCall' && command.MoveCall.function === 'collect_reward') {
        collectRewards.push({
          pool: this.getObjectID(this.getInputIndex(command, 1)),
          position: this.getObjectID(this.getInputIndex(command, 2)),
          rewardCoinType: this.getTypeArguments(command)[2],
        });
      }
    });

    return collectRewards;
  }

  private get commands() {
    return this.transaction.getData().commands;
  }

  private get inputs() {
    return this.transaction.getData().inputs;
  }

  private isOpenPositionTx() {
    return !!this.getMoveCallCommand('open_position');
  }

  private isProvideLiquidityTx() {
    return !!this.getMoveCallCommand('provide_liquidity_with_fixed_amount');
  }

  private isRemoveLiquidityTx() {
    return !!this.getMoveCallCommand('remove_liquidity');
  }

  private isCollectRewardsTx() {
    return !!this.getMoveCallCommand('collect_reward');
  }

  private isCollectFeeTx() {
    return !!this.getMoveCallCommand('collect_fee');
  }

  private getMoveCallCommand(fn: string) {
    return this.commands.find((command) => command.$kind === 'MoveCall' && command.MoveCall.function === fn);
  }

  private getObjectID(index: number): string {
    return this.inputs[index].UnresolvedObject.objectId as string;
  }

  private getU32(index: number): string {
    return String(bcs.u32().parse(Uint8Array.from(fromB64(this.inputs[index].Pure.bytes))));
  }

  private getU64(index: number): string {
    return bcs.u64().parse(Uint8Array.from(fromB64(this.inputs[index].Pure.bytes)));
  }

  private getU128(index: number): string {
    return bcs.u128().parse(Uint8Array.from(fromB64(this.inputs[index].Pure.bytes)));
  }

  private getBoolean(index: number): boolean {
    return bcs.bool().parse(Uint8Array.from(fromB64(this.inputs[index].Pure.bytes)));
  }

  private getAddress(index: number): string {
    return bcs.Address.parse(Uint8Array.from(fromB64(this.inputs[index].Pure.bytes)));
  }

  private getInputIndex(command: any, index: number): number {
    return command.MoveCall.arguments[index].Input;
  }

  private getTypeArguments(command: any): Array<string> {
    return command.MoveCall.typeArguments || [];
  }
}
