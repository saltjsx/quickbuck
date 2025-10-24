Quickbuck Cryptocurrency Market Algorithm — Spec
Goals

Realistic crypto behavior: large short-term swings, strong sensitivity to on-chain events (TVL, staking, unlocks), AMM mechanics, and 24/7 trading.

Auto-update every 5 minutes (synchronous tick).

Prevent trivial exploits (front-running, oracle manipulation) while preserving realistic vulnerabilities to test player strategies.

Tunable for different token types (stablecoins, liquid large-cap, small cap / memecoin, DeFi tokens).

High-level architecture (components)

Token model (tokenomics & on-chain metrics) — slow and medium speed signals.

Liquidity layer — supports centralized order-book venues and decentralized AMM pools.

Order flow & agents — retail, whales, LPs, arbitrage bots, miners/validators (if relevant).

Price formation engine — integrates AMM swap math, order-book matching, and cross-venue arbitrage.

Funding & leverage module — margin, perp funding rates, liquidations.

Oracles & feeds — TWAPs and multi-source price inputs.

Anti-exploit / mitigation — front-run protection, oracle defense, rate limits.

Everything runs once per 5-minute tick. Market data is continuous (24/7) so tick count per year is higher than equities.

Key token data model

Per token T:

symbol, name

total_supply (integer)

circulating_supply (integer)

locked_supply (vested/treasury/escrow)

inflation_rate (annual %; e.g., miner/validator issuance)

staking_rate (fraction of circulating staked)

burn_rate (ongoing burn per tick or per tx)

market_cap (derived = price × circulating_supply)

price (USD or base fiat)

onchain_tx_volume_5min

active_addresses_24h

tvl (Total Value Locked, for DeFi tokens)

liquidity_pools (list of AMM pools and reserves)

order_books (CEX-style aggregated depth across venues)

sentiment, news_score

volatility_est (annualized)

last_tick_timestamp

Player-visible:

price, market_cap, 24h_volume, liquidity_depth, funding_rate, next_unlocks.

Fundamental / long-term drivers (crypto flavored)

Unlike equities, crypto fundamentals are often non-financial or on-chain metrics. A composite fundamental score F can drive long-term fair value:

F = base_value × f_tvl(TVL) × f_active_users(AA) × f_staking(stake_rate) × f_inflation(inflation_rate) × f_tokenomics(lock_ratio) × (1 + sentiment + news_score)


Where base_value can derive from comparable market caps for similar TVL/metrics or an educated multiple of TVL for DeFi protocols (e.g., MarketCap ≈ TVL × multiple), or community adoption proxies.

Examples:

DeFi protocol: MarketCap_fundamental ≈ TVL × M_tvl (M_tvl 0.05–1 depending on protocol type).

Utility token: MarketCap_fundamental ≈ active_users × monetization_per_user × revenue_multiple.

Meme token: fundamentals weak → market driven by sentiment & liquidity.

Important: In crypto, token supply dynamics (vesting unlocks, burns, staking) directly change price via circulating supply changes; include explicit modeling of scheduled unlocks and burning.

Market structure — venues & price formation

Your simulation should support multiple venues and cross-venue arbitrage:

AMM pools (Uniswap style) — constant-product x * y = k pools, possibly multi-pair (TOKEN/USDC, TOKEN/ETH).

Swap math determines instantaneous price and slippage.

LPs gain fees; impermanent loss tracked.

Order-book venues (CEX-like) — buy/sell limit orders, matching engine.

Cross-venue arbitrage engine — finds price differences and executes trades (reduces inter-venue divergence).

Derivatives venue — perpetual futures with funding rate mechanics and liquidations that can amplify moves.

AMM price & slippage (explicit)

AMM pool reserves: x = reserve_token, y = reserve_usd (USDC/fiat or base asset). k = x * y.

If a user swaps Δx tokens into the pool (selling tokens for USDC), new token reserve x' = x + Δx. New USD reserve y' = k / x'. USD out to user = y - y' (minus fee).

Worked AMM example — arithmetic step-by-step

Initial reserves:

x = 500,000 TOKEN

y = 500,000 USDC

So initial price = y / x = 500,000 / 500,000 = 1 USDC per TOKEN.
Arithmetic: 500,000 ÷ 500,000 = 1.

k = x * y = 500,000 × 500,000 = 250,000,000,000.

Multiply step: 5e5 × 5e5 = 25e10 → 250,000,000,000.

A trader sells Δx = 10,000 TOKEN into the pool:

new token reserve x' = x + Δx = 500,000 + 10,000 = 510,000.

new USD reserve y' = k / x' = 250,000,000,000 ÷ 510,000.

Division: 250,000,000,000 ÷ 510,000 ≈ 490,196.078431 (we’ll show steps conceptually: 510k × 490,196.078431 ≈ 250e9).

USD out = y - y' = 500,000 - 490,196.078431 = 9,803.921569 USDC.

Effective price per token for that trade = USD out / TOKEN in = 9,803.921569 ÷ 10,000 = 0.9803921569 USDC per TOKEN.

So price slipped from 1.0000 → ~0.980392 (approx 1.96% instantaneous slippage).

This shows how AMM slippage scales nonlinearly with trade size and pool depth.

Order-book price impact

For CEX-style venues, use depth buckets and price impact curves (linear to convex) or simulate full matching of limit orders. Combine liquidity across venues to compute a volume-weighted mid-price.

Cross-venue blended price

Compute each venue price; blended market price is liquidity-weighted average, with arbitrage bots moving price toward parity each tick.

Short-term mechanics & 5-minute tick price update

Per tick we combine:

Fundamental target price (from on-chain fundamentals).

Venue-specific order flows (AMM swaps and order-book trades).

Arbitrage trades aligning venue prices.

Derivative funding and liquidations causing additional flow.

Noise & volatility.

Typical price update pipeline per token T:

Recompute fundamentals: price_fund = marketcap_fundamental / circulating_supply.

Aggregate AMM swaps for tick: for each pool, compute swaps (from agents) using AMM math; update reserves and effective price movement per pool.

Order book trades: match limit/market orders on CEX venues; compute executed volumes and after-trade mid.

Arbitrage: bots detect price differences across venues and execute trades (limited by fees and slippage), moving venues toward parity.

Derivatives effects:

Compute funding_rate based on index vs. perp price. If perp price > index → longs pay shorts; this shifts positions and may cause liquidations.

Simulate liquidations: if margin positions fall below maintenance margin, liquidators execute market orders that move price.

Combine into net order imbalance I across all venues.

Blended price target: apply impact function per venue liquidity to get price_targ.

Mean reversion to fundamental: price_new = price_targ*(1-α) + price_fundamental*α.

Stochastic term: price_new *= exp(σ_tick * Z) where σ_tick uses 24/7 tick count.

Supply events: apply scheduled unlocks (increase circulating_supply) or burns (decrease), then recompute market_cap and adjust price if you treat supply changes as onchain transactions that occur within tick.

Round & persist.

Tick count per year (5-minute ticks, 24/7):

N_ticks_per_year = 365 days × 24 hours/day × 12 ticks/hour = 365 × 24 × 12 = 105,120 ticks/year.
(Use this to convert annual vol → per-tick vol.)

Agents (crypto-specific)

Retail traders — noisy, trend-following, meme-driven; respond strongly to social sentiment.

Whales — large single trades with capacity to move price. Subject to order caps.

Liquidity Providers (LPs) — add/remove liquidity to AMM pools; earn fees but suffer impermanent loss. React to fees & volatility.

Arbitrage bots — exploit cross-venue differences and AMM <> CEX spreads.

Market makers (CEX) — place limit orders, provide depth; profit from spreads & rebates.

Validators / Miners (issuance agents) — mint new tokens per issuance schedule (inflation), can sell to market.

DeFi protocols — perform treasury moves, staking/unstaking, redemptions, liquidations.

MEV / frontrunners (simulated for realism) — attempt sandwiching or reorder trades, but you should model them only to detect & mitigate (see anti-exploit).

Each agent has parameters: frequency, size distribution, strategy weights (momentum, mean-reversion, liquidity provision, arbitrage), fee sensitivity.

Tokenomics and scheduled events

Vesting cliffs / unlocks: model scheduled increases to circulating_supply. Large unlocks should reduce price pressure over time.

Burn mechanics: per-transaction burn or protocol-level burns reduce supply.

Staking: tokens staked are removed from liquid supply (affects effective circulating supply).

Treasury operations: treasury sells or buys can create large flows.

Airdrops / forks: produce short-term volatility.

When an unlock occurs during tick t, model it as increased circulating_supply at some point during the tick; optionally split across ticks.

Funding rates & leverage (perpetuals)

Compute index price from blended spot feeds.

Perp funding rate = clamp( k × ln(perp_price / index_price), min_rate, max_rate ) per funding interval. For simplicity per-tick funding = funding_rate * tick_duration_fraction.

Liquidations: if leveraged positions drop below maintenance margin, liquidator market orders execute, moving price and potentially cascading.

Liquidations can amplify volatility — simulate with care and caps.

Oracles & price feeds

Use multi-source oracles (median across top N venues) and TWAP over some window (e.g., 5–30 minutes) for sensitive modules (derivatives settlement, on-chain contracts).

Protect against oracle manipulation by:

Using multiple feeds and median

Hardened TWAPs (clamped)

Rate limits on price jumps used by onchain modules

Delay high-amplitude changes for governance review (optional for game)

Anti-exploit & mitigation (important)

Front-run / sandwich protection: simulate MEV but implement protections: randomizing tx ordering, time-weighted matching, or small per-order delay for public orders. Do not provide actionable instructions to exploit.

Oracle manipulation: require multi-source medians and TWAP; ignore single-source spikes.

Large trade caps: limit single trade to % of pool (e.g., 1–5% of pool value) unless trader is allowed special permission.

LP protection: delayed withdrawal windows for LPs after large protocol events (to avoid flash draining).

Liquidation throttles: cap maximum liquidation volume per tick to avoid cascading complete wipeouts.

Trade fees: fees and slippage to disincentivize rapid wash trades.

Flag suspicious behavior: repeated flip trades between same accounts flagged for review/penalty.

Parameters (suggested defaults for crypto)

tick_interval = 5 minutes

N_ticks_per_year = 105,120

α (mean reversion) = 0.03 (crypto tends to be less mean-reverting than equities per tick)

λ (impact scale base) = 0.06 (higher than equities; tune per liquidity)

max_trade_pct_pool = 0.05 (5% of pool value default cap)

trade_fee_amm = 0.30% (Uniswap-like) — LP fee

trade_fee_central = 0.05% + $0.00 per order — CEX fee

funding_rate_k = 0.025 (scale factor for funding calculation) — clamp to ±0.5% per tick

oracle_twap_window = 15 minutes

oracles_used = 3–5

σ_annual defaults by token type:

stablecoin: 5% (target low)

large cap GPU/ETH-like: 80% (example)

small cap / memecoin: 200%+

Example 1 — Price from circulating supply (simple arithmetic)

Token X:

circulating_supply = 1,000,000,000 tokens.

Suppose your blended market cap target is $1,000,000,000.

Price per token = market_cap / circulating_supply.

1,000,000,000 ÷ 1,000,000,000 = 1 → $1.00 per token.

Step-by-step: divide 1,000,000,000 by 1,000,000,000 equals 1 exactly.

If a scheduled unlock increases circulating supply to 1,100,000,000 (increase of 100,000,000), and market cap stayed roughly same, new price = 1,000,000,000 ÷ 1,100,000,000 ≈ 0.9090909 → about $0.9091 (≈9.09% drop).

Arithmetic:
1,000,000,000 ÷ 1,100,000,000 = 10/11 ≈ 0.9090909091.

Example 2 — AMM swap (we showed earlier) — restated concisely

Initial pool: 500,000 TOKEN / 500,000 USDC → price = $1.

Seller swaps 10,000 TOKEN into pool:

New token reserve: 510,000.

New USDC reserve = 250,000,000,000 ÷ 510,000 ≈ 490,196.078431.

USDC out ≈ 9,803.921569.

Effective price ≈ 0.980392 per TOKEN (slip ≈ 1.9608%).

This demonstrates slippage scale for AMM pools.

Five-minute tick loop (detailed)

Run every 5 minutes (synchronously):

Tick start — stamp t.

Update token metrics:

Update on-chain metrics (simulate new activity): active_addresses_24h, tx_volume_5min, TVL.

Apply scheduled supply events (vests/unlocks, burns, staking changes).

Recompute fundamentals:

For DeFi tokens, fundamental_market_cap = TVL × M_tvl × (1 + sentiment + news_score).

For utility tokens, use active users × monetization proxy.

Compute price_fundamental = fundamental_market_cap / circulating_supply.

Generate news & social sentiment:

With token-specific probability spawn events (protocol upgrade, exploit/hack, exchange listing, audit, partnership).

Update news_score and short-term sentiment (decay over 1–48 ticks).

Agent order generation:

Each agent decides to submit orders to AMMs or order books (market/limit).

Enforce order caps and fees.

AMM swaps:

For each swap request to a pool, compute AMM result using x*y=k, apply fee, update reserves, compute local price change.

Order book matching:

Execute queued orders on CEX venues; update mid prices and depth.

Arbitrage:

Run arbitrage module to equalize cross-venue prices (limited by fees & slippage).

Derivatives & funding:

Compute funding rate and apply fund transfers.

Evaluate margin positions; perform liquidations (throttled).

Combine imbalances and compute blended price_targ.

Mean reversion & noise:

price_new = price_targ*(1-α) + price_fundamental*α

σ_tick = σ_annual / sqrt(N_ticks_per_year).

price_new *= exp(σ_tick * Z).

Update metrics:

market_cap = price_new × circulating_supply

Update volatility EWMA, liquidity, 24h volume summary.

Record & persist tick (price, volumes, pool reserves, events).

Run anti-exploit checks: detect front-run attempts, oracle anomalies; apply penalties or rollbacks if severe.

Pseudocode (core loop)
N_ticks_per_year = 105120
for each tick (every 5 minutes):
    for each token T:
        apply_scheduled_supply_events(T)
        update_onchain_metrics(T)  # tx volume, active addresses, TVL

        fundamental_cap = compute_fundamental_cap(T)   # TVL×multiple, user adoption, etc
        price_fund = fundamental_cap / T.circulating_supply

        spawn_news_and_update_sentiment(T)

        amms_swaps = simulate_amms_swaps(T)  # uses constant product math, updates reserves
        cex_trades = simulate_cex_trades(T)  # orderbook matching
        arbitrage_trades = simulate_arbitrage(T, venues)

        apply_derivatives_effects(T)  # funding rates, liquidations

        # Compute blended price from venues (liquidity-weighted)
        price_targ = compute_venue_blended_price(T)

        # Revert toward fundamental
        price_after_revert = price_targ * (1 - alpha) + price_fund * alpha

        # Add stochastic noise
        sigma_tick = T.sigma_annual / sqrt(N_ticks_per_year)
        Z = random_normal()
        price_new = price_after_revert * exp(sigma_tick * Z)
        price_new = round_price_tick(price_new)

        update_marketcap_and_metrics(T, price_new)
        persist_tick(T)
        run_mitigation_and_flagging(T)

Testing & validation checklist

Sanity checks: known scenarios produce expected arithmetic (e.g., supply doubling halves price if market cap constant).

AMM tests: for given initial reserves, verify swap outputs match constant-product math.

Arbitrage tests: create price divergence and confirm arbitrage closes gap (within fees), leaving no unrealistic permanent arbitrage.

Liquidation stress tests: generate large leveraged positions and sudden price drops; ensure throttles prevent total wipeout cascades.

Oracle attack tests: simulate single-feed spike and ensure median/TWAP resist manipulation.

Exploit simulations: attempt sandwich, front-run, and wash trades and verify detection/mitigation engages.

Volatility profile: simulate long runs, compute realized vol by token type — tune to desired σ_annual.

Metrics to monitor

Realized volatility vs target by token.

Pool depth and average slippage for given trade sizes.

% of volume from arbitrage vs organic trading.

Number and size of liquidations per day.

Number of flagged suspicious accounts/events.

Tuning knobs (quick reference)

Increase α → faster pull to fundamentals (reduce speculation).

Increase AMM fee → encourage LPs, reduce frequent arbitrage.

Smaller max_trade_pct_pool → reduce whale impact.

Increase N_oracles / TWAP_window → more oracle robustness (but slower reaction).

Increase λ → trades have bigger immediate impact (more volatile).

Extensions & future features

On-chain wallet visualizer for large holders and whale watch alerts.

Permit players to be LPs and manage impermanent loss.

Cross-chain bridges and bridging risk events.

Governance proposals and votes altering tokenomics (game mechanic).

Simulated hack/exploit scenarios for emergency response gameplay.