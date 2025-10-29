# Crypto Price Update Fix

## Problem
Cryptocurrency prices were not updating automatically per tick, and prices did not update instantly when purchasing crypto.

## Root Causes Identified

### 1. Missing Required Fields
When cryptocurrencies were created, they were missing critical fields needed for the price update algorithm:
- `sentiment` (should be 0 for neutral)
- `newsScore` (should be 0 initially)
- `volatilityEst` (should be 2.5 for high crypto volatility)

These fields were referenced in the `updateCryptoPrices` function in `tick.ts` but were undefined, causing the algorithm to fail or produce incorrect results.

### 2. Multiple Patch Operations
In both `buyCryptocurrency` and `sellCryptocurrency` functions, there were TWO separate database patches on the same crypto document:
1. First patch updated `circulatingSupply`
2. Second patch updated price, marketCap, volume, etc.

This caused issues:
- The second patch used stale data (`crypto.circulatingSupply + args.amount`) that was already modified by the first patch
- Race conditions and inconsistencies in market cap calculations
- Price updates might not apply correctly

## Changes Made

### 1. Initialize Fields on Crypto Creation (`convex/crypto.ts`)
Added initialization of required fields when creating a cryptocurrency:
```typescript
sentiment: 0, // neutral sentiment
newsScore: 0, // no news impact initially
volatilityEst: 2.5, // high base volatility for crypto
```

### 2. Atomic Price Updates on Buy (`convex/crypto.ts`)
Consolidated all crypto updates into a single atomic patch operation:
- Calculate new circulating supply first
- Calculate new price based on buy pressure
- Calculate new market cap using the NEW circulating supply
- Update all fields in one `ctx.db.patch` call

Benefits:
- Eliminates race conditions
- Ensures data consistency
- Price updates apply immediately when crypto is purchased

### 3. Atomic Price Updates on Sell (`convex/crypto.ts`)
Applied same fix to the sell function:
- Calculate new circulating supply
- Calculate new price based on sell pressure
- Calculate new market cap using the NEW circulating supply
- Update all fields in one atomic operation

### 4. Backward Compatibility (`convex/tick.ts`)
Added automatic initialization of missing fields for existing cryptocurrencies:
```typescript
if (crypto.sentiment === undefined || crypto.newsScore === undefined || crypto.volatilityEst === undefined) {
  await ctx.db.patch(crypto._id, {
    sentiment: crypto.sentiment ?? 0,
    newsScore: crypto.newsScore ?? 0,
    volatilityEst: crypto.volatilityEst ?? 2.5,
  });
}
```

This ensures that old cryptocurrencies created before this fix will automatically get the required fields on the next tick.

## Testing
To verify the fix works:

1. **Immediate Price Update on Purchase**:
   - Create or buy a cryptocurrency
   - The price should update instantly after purchase
   - Check the `previousPrice` and `price` fields

2. **Automatic Tick Updates**:
   - Wait for a tick (5 minutes)
   - All crypto prices should update automatically
   - Check console logs for "Executing tick" and crypto update counts

3. **Existing Cryptos**:
   - If any cryptos existed before this fix, they should automatically get the missing fields on the next tick
   - Look for console log: "Initializing missing fields for crypto {id}"

## Impact
- ✅ Crypto prices now update automatically every 5 minutes via tick
- ✅ Crypto prices update instantly when bought or sold
- ✅ No more race conditions in price calculations
- ✅ Market cap values are accurate and consistent
- ✅ Backward compatible with existing cryptocurrencies
- ✅ Price history is properly recorded for charts

## Files Modified
- `/convex/crypto.ts` - Fixed buy/sell price updates and added field initialization
- `/convex/tick.ts` - Added backward compatibility for existing cryptos
