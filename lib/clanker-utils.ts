// Utility functions adapted from clanker-sdk/src/utils/desired-price.ts
// Import from SDK to avoid duplication
import { 
  WETH_ADDRESS, 
  DEGEN_ADDRESS, 
  NATIVE_ADDRESS, 
  CLANKER_ADDRESS, 
  ANON_ADDRESS,
  HIGHER_ADDRESS,
  CB_BTC_ADDRESS,
  A0X_ADDRESS
} from 'clanker-sdk';

export { 
  WETH_ADDRESS, 
  DEGEN_ADDRESS, 
  NATIVE_ADDRESS, 
  CLANKER_ADDRESS, 
  ANON_ADDRESS,
  HIGHER_ADDRESS,
  CB_BTC_ADDRESS,
  A0X_ADDRESS
};

export type TokenPair = 'WETH' | 'DEGEN' | 'NATIVE' | 'CLANKER' | 'ANON' | 'HIGHER' | 'BTC' | 'A0x' | 'WMON';

export function getTokenPairByAddress(address: string): TokenPair {
  if (!address) return 'WETH';
  const addr = address.toLowerCase();
  if (addr === WETH_ADDRESS.toLowerCase()) return 'WETH';
  if (addr === DEGEN_ADDRESS.toLowerCase()) return 'DEGEN';
  if (addr === NATIVE_ADDRESS.toLowerCase()) return 'NATIVE';
  if (addr === CLANKER_ADDRESS.toLowerCase()) return 'CLANKER';
  if (addr === ANON_ADDRESS.toLowerCase()) return 'ANON';
  if (addr === HIGHER_ADDRESS.toLowerCase()) return 'HIGHER';
  if (addr === CB_BTC_ADDRESS.toLowerCase()) return 'BTC';
  if (addr === A0X_ADDRESS.toLowerCase()) return 'A0x';
  return 'WETH';
}

export function getDesiredPriceAndPairAddress(pair: TokenPair, marketCap: number = 10) {
  let desiredPrice = 0.0000000001;
  let pairAddress = WETH_ADDRESS;

  if (pair === 'WETH') {
    desiredPrice = marketCap * 0.00000000001;
  } else if (pair === 'DEGEN') {
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
} 