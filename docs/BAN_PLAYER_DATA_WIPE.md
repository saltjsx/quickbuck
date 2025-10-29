# Ban Player - Complete Data Wipe Implementation ✅

## Overview
When a player is banned, ALL of their data is now completely removed from the system (except global alerts and ban records).

## What Gets Deleted

### Direct Ownership/Creation
- ✅ All companies owned by the player
  - All products in those companies
  - Stock records for public companies
  - Marketplace listings for those companies
  - Company sales listings
- ✅ All cryptocurrencies created by the player
  - Crypto trades for those cryptos
  - Crypto price history for those cryptos
- ✅ User carts and cart items
- ✅ Player inventory items
- ✅ Upgrades purchased by player
- ✅ Gambling history

### Holdings/Ownership
- ✅ All stock holdings
- ✅ All crypto holdings
- ✅ All company shares owned
- ✅ All loans taken by player

### Transactions & Activity
- ✅ All transactions FROM the player (as sender)
- ✅ All transactions TO the player (as receiver)
- ✅ All marketplace sales where they were purchaser
- ✅ Balance set to 0

## What is Preserved (Intentionally)

### Historical Records
- 📝 Stock price history (for market analysis)
- 📝 Stock trades history (for market records)
- 📝 Tick history (for system records)

### Admin Records
- 📝 Global alerts (to preserve moderation messages)
- 📝 Moderation records (warnings, limits, bans)
- 📝 The ban record itself with reason

## Implementation Details

**File:** `convex/moderation.ts`

**Function:** `banPlayer` mutation

### Process Flow
```
1. Verify permissions (mod or admin only)
2. Fetch target player
3. Prevent banning admins or self
4. Delete all companies and their related data
5. Delete stock/crypto holdings
6. Delete cryptos created by player
7. Delete cart data
8. Delete transactions
9. Delete loans
10. Delete company shares
11. Delete inventory
12. Delete upgrades
13. Delete gambling history
14. Mark player as banned (role = "banned")
15. Set balance to 0
```

### Data Deletion Order
The deletion follows a dependency order:
1. Delete dependent records first (products, items, trades)
2. Delete parent records (companies, cryptos)
3. Delete holdings and ownership records
4. Finally mark player as banned

This ensures referential integrity throughout the process.

## Database Tables Affected

| Table | Action | Reason |
|-------|--------|--------|
| companies | Delete | Remove owned companies |
| products | Delete | Remove company products |
| stocks | Delete | Remove stock records |
| userStockHoldings | Delete | Remove stock ownership |
| userCryptoHoldings | Delete | Remove crypto ownership |
| cryptocurrencies | Delete | Remove created cryptos |
| cryptoTrades | Delete | Remove crypto transactions |
| cryptoPriceHistory | Delete | Remove crypto history |
| carts | Delete | Remove shopping carts |
| cartItems | Delete | Remove cart contents |
| transactions | Delete | Remove financial history |
| loans | Delete | Remove debt records |
| companyShares | Delete | Remove company ownership |
| marketplaceSales | Delete | Remove purchase records |
| playerInventory | Delete | Remove inventory items |
| upgrades | Delete | Remove purchased upgrades |
| gamblingHistory | Delete | Remove gambling records |
| marketplaceListings | Delete | Remove seller listings |
| companySales | Delete | Remove company sales listings |
| players | PATCH | Mark as banned, zero balance |

## Security Considerations

✅ **Permission Check:** Only mods and admins can ban
✅ **Self-Ban Protection:** Users cannot ban themselves
✅ **Admin Protection:** Admins cannot be banned
✅ **Clean State:** Banned player left with 0 balance and no assets
✅ **Audit Trail:** Ban reason and timestamp preserved

## Example Ban Scenario

**Player: alice (has companies, cryptos, holdings, etc.)**

When `banPlayer("alice", "Violating ToS")` is called:
1. Alice's 3 companies deleted (along with all their products)
2. Alice's stocks (in other companies) deleted
3. Alice's cryptos deleted
4. Alice's crypto holdings deleted
5. Alice's cart cleared
6. All 50+ transactions cleared
7. Alice's loans cleared
8. Alice's inventory cleared
9. Alice's upgrades cleared
10. Alice marked as banned with reason "Violating ToS"
11. Alice's balance set to 0

**Result:** Clean slate, no orphaned data

## Testing the Feature

### To ban a player:
```typescript
// Call from moderation panel or directly
await banPlayer({
  targetPlayerId: "player_id_here",
  reason: "Violating Terms of Service"
});
```

### Verification:
1. ✅ Player appears as "banned" in moderation panel
2. ✅ Player cannot log in / access features
3. ✅ No companies exist for that player
4. ✅ No items, stocks, or assets remain
5. ✅ Balance is 0
6. ✅ Ban reason visible in player records

## Performance Notes

⚠️ **Large Data Sets:** For players with significant holdings, this operation may take a few seconds due to multiple queries and deletions.

**Recommendation:** Run ban operations during off-peak hours for players with extensive data.

## Future Improvements

- [ ] Add batch deletion optimization
- [ ] Add ban confirmation dialog
- [ ] Send notification to other mods
- [ ] Maintain detailed audit log of deleted items
- [ ] Add scheduled/delayed ban option
- [ ] Add ban appeal system

## Related Functions

- `unbanPlayer()` - Restores player to normal role (but data stays deleted)
- `limitPlayer()` - Restricts player actions without deleting data
- `getAllPlayersForModeration()` - View all players with filter by role
- `assignModerator()` - Grant mod permissions

## Status

✅ **IMPLEMENTED AND TESTED**

Ban functionality now provides complete data cleanup while maintaining admin audit trails.
