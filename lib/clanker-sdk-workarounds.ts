// Workaround for missing SDK exports. Remove when SDK exports these utilities.

import { WETH_ADDRESS, DEGEN_ADDRESS, NATIVE_ADDRESS, CLANKER_ADDRESS, ANON_ADDRESS, HIGHER_ADDRESS, CB_BTC_ADDRESS, A0X_ADDRESS } from 'clanker-sdk';

export type TokenPair =
  | 'WETH'
  | 'DEGEN'
  | 'ANON'
  | 'HIGHER'
  | 'CLANKER'
  | 'BTC'
  | 'NATIVE'
  | 'A0x'
  | 'WMON'
  | null;

export const getTokenPairByAddress = (address: `0x${string}`): TokenPair => {
  if (address === WETH_ADDRESS) {
    return 'WETH';
  }
  if (address === DEGEN_ADDRESS) {
    return 'DEGEN';
  }
  if (address === NATIVE_ADDRESS) {
    return 'NATIVE';
  }
  if (address === CLANKER_ADDRESS) {
    return 'CLANKER';
  }
  if (address === ANON_ADDRESS) {
    return 'ANON';
  }
  if (address === HIGHER_ADDRESS) {
    return 'HIGHER';
  }
  if (address === CB_BTC_ADDRESS) {
    return 'BTC';
  }
  if (address === A0X_ADDRESS) {
    return 'A0x';
  }
  return 'WETH';
};

export const getDesiredPriceAndPairAddress = (pair: TokenPair, marketCap: number = 10) => {
  let desiredPrice = 0.0000000001;
  let pairAddress = WETH_ADDRESS;

  if (pair === 'WETH') {
    desiredPrice = marketCap * 0.00000000001;
  }

  if (pair === 'DEGEN') {
    desiredPrice = 0.00000666666667;
    pairAddress = DEGEN_ADDRESS;
  } else if (pair === 'CLANKER') {
    const clankerPrice = 20;
    const desiredMarketCap = 10000;
    const totalSupplyDesired = 100_000_000_000;
    const howManyClankerForDesiredMarketCap = desiredMarketCap / clankerPrice;
    const pricePerTokenInClanker = howManyClankerForDesiredMarketCap / totalSupplyDesired;
    desiredPrice = pricePerTokenInClanker;
    pairAddress = CLANKER_ADDRESS;
  } else if (pair === 'ANON') {
    const anonPrice = 0.001;
    const desiredMarketCap = 10000;
    const totalSupplyDesired = 100_000_000_000;
    const howManyAnonForDesiredMarketCap = desiredMarketCap / anonPrice;
    const pricePerTokenInAnon = howManyAnonForDesiredMarketCap / totalSupplyDesired;
    desiredPrice = pricePerTokenInAnon;
    pairAddress = ANON_ADDRESS;
  } else if (pair === 'HIGHER') {
    const higherPrice = 0.008;
    const desiredMarketCap = 10000;
    const totalSupplyDesired = 100_000_000_000;
    const howManyHigherForDesiredMarketCap = desiredMarketCap / higherPrice;
    const pricePerTokenInHigher = howManyHigherForDesiredMarketCap / totalSupplyDesired;
    desiredPrice = pricePerTokenInHigher;
    pairAddress = HIGHER_ADDRESS;
  } else if (pair === 'BTC') {
    const cbBtcPrice = 105000;
    const desiredMarketCap = 10000;
    const totalSupplyDesired = 100_000_000_000;
    const howManyCBBTCForDesiredMarketCap = desiredMarketCap / cbBtcPrice;
    const pricePerTokenInCbBtc = howManyCBBTCForDesiredMarketCap / totalSupplyDesired / 10 ** 10;
    desiredPrice = pricePerTokenInCbBtc;
    pairAddress = CB_BTC_ADDRESS;
  } else if (pair === 'NATIVE') {
    const nativePrice = 0.00004;
    const desiredMarketCap = 10000;
    const totalSupplyDesired = 100_000_000_000;
    const howManyNativeForDesiredMarketCap = desiredMarketCap / nativePrice;
    const pricePerTokenInNative = howManyNativeForDesiredMarketCap / totalSupplyDesired;
    desiredPrice = pricePerTokenInNative;
    pairAddress = NATIVE_ADDRESS;
  } else if (pair === 'A0x') {
    const a0xPrice = 0.00000073;
    const desiredMarketCap = 5000;
    const totalSupplyDesired = 100_000_000_000;
    const howManyA0xForDesiredMarketCap = desiredMarketCap / a0xPrice;
    const pricePerTokenInA0x = howManyA0xForDesiredMarketCap / totalSupplyDesired;
    desiredPrice = pricePerTokenInA0x;
    pairAddress = A0X_ADDRESS;
  } else if (pair === 'WMON') {
    desiredPrice = marketCap * 0.00000000001;
    pairAddress = '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701';
  }

  return { desiredPrice, pairAddress };
}; 