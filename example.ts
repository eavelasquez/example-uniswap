import { ethers } from 'ethers'
import { Pool } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
// import { Address } from 'cluster'

const provider = new ethers.providers.JsonRpcProvider(
  'https://mainnet.infura.io/v3/635ec189c48c44f7a7d51569784ac00e'
)

const poolAddress = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8'

// const poolImmutablesAbi = [
//   'function factory() external view returns (address)',
//   'function token0() external view returns (address)',
//   'function token1() external view returns (address)',
//   'function fee() external view returns (uint24)',
//   'function tickSpacing() external view returns (int24)',
//   'function maxLiquidityPerTick() external view returns (uint128)',
// ]

const poolContract = new ethers.Contract(
  poolAddress,
  IUniswapV3PoolABI, // poolImmutablesAbi,
  provider
)

interface Immutables {
  factory: string // Address
  token0: string // Address
  token1: string // Address
  fee: number
  tickSpacing: number
  maxLiquidityPerTick: ethers.BigNumber // number
}

interface State {
  liquidity: ethers.BigNumber
  sqrtPriceX96: ethers.BigNumber
  tick: number
  observationIndex: number
  observationCardinality: number
  observationCardinalityNext: number
  feeProtocol: number
  unlocked: boolean
}

async function getPoolImmutables(): Promise<Immutables> {
  const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] =
    await Promise.all([
      poolContract.factory(),
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.maxLiquidityPerTick(),
    ])

  const immutables: Immutables = {
    factory,
    token0,
    token1,
    fee,
    tickSpacing,
    maxLiquidityPerTick,
  }
  return immutables
}

// getPoolImmutables().then(console.log)

async function getPoolState(): Promise<State> {
  const [liquidity, slot] = await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ])

  const state: State = {
    liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  }
  return state
}

async function main() {
  const [immutables, state] = await Promise.all([
    getPoolImmutables(),
    getPoolState(),
  ])

  const TokenA = new Token(3, immutables.token0, 6, 'USDC', 'USD Coin')
  const TokenB = new Token(3, immutables.token1, 18, 'WETH', 'Wrapped Ether')

  const pool = new Pool(
    TokenA,
    TokenB,
    immutables.fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick,
  )
  console.log(pool)
}

main()
