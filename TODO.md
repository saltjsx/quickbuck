# Quickbuck Game - Development Checklist

## Important Notes
- **Phase 1 Focus**: FUNCTIONALITY ONLY - Use shadcn UI components, don't worry about polish
- **Phase 2 Focus**: UI refinement and polish
- **NO unnecessary README files or documentation** during development
- **All features must have vitest tests** to confirm functionality
- **Type checking and tests must pass** before moving to next section
- **✅ FIXED**: Clerk userId validation - now using findUserByToken to get Convex user ID
- **✅ REMOVED**: Chat and Settings tabs from dashboard - simplified to Dashboard only
- **✅ UPDATED**: Using Clerk UserButton component in sidebar footer

---

## Phase 1: Core Functionality

### 1. Database Schema & Backend Setup (Convex)

- [x] 1.1. Update schema.ts with core tables:
  - [x] Players table (id, userId, balance, netWorth, createdAt, updatedAt)
  - [x] Companies table (id, ownerId, name, ticker, description, logo, balance, marketCap, isPublic, createdAt, updatedAt)
  - [x] Products table (id, companyId, name, description, price, productionCost, image, tags, stock, totalRevenue, createdAt)
  - [x] Stocks table (id, companyId, ticker, price, totalShares, marketCap, createdAt, updatedAt)
  - [x] UserStockHoldings table (id, userId, companyId, shares, boughtAt)
  - [x] Cryptocurrencies table (id, creatorId, name, ticker, description, image, price, marketCap, volume, createdAt)
  - [x] UserCryptoHoldings table (id, userId, cryptoId, amount, boughtAt)
  - [x] Cart table (id, userId, items, totalPrice)
  - [x] CartItems table (id, cartId, productId, quantity, pricePerUnit)
  - [x] Transactions table (id, fromAccountId, fromAccountType, toAccountId, toAccountType, amount, assetType, description, createdAt)
  - [x] Loans table (id, playerId, amount, interestRate, remainingBalance, createdAt, dueDate, status)
  - [x] Marketplace_Listings table (id, productId, quantity, listedPrice, sellerCompanyId, soldQuantity, createdAt)
  - [x] CompanyShares table (id, companyId, userId, shares, purchasePrice)
  - [x] Marketplace_Sales table (id, productId, quantity, purchaserId, totalPrice, createdAt)
  - [x] CompanySales table (id, companyId, buyerId, offeredPrice, counterOfferPrice, status, createdAt, updatedAt)
  - [x] Tick history table (id, timestamp, botPurchases)
- [x] 1.2. Write Convex mutation functions:
  - [x] createPlayer(userId)
  - [x] updatePlayerBalance(playerId, amount)
  - [x] createCompany(ownerId, name, ticker, description, logo)
  - [x] updateCompanyBalance(companyId, amount)
  - [x] createProduct(companyId, name, description, price, productionCost, image, tags)
  - [x] createStock/makeCompanyPublic(companyId, ticker, initialSharePrice, totalShares)
  - [x] buyStock/sellStock (userId, stockId, shares, accountType, accountId)
  - [x] createCryptocurrency(creatorId, name, ticker, description, image)
  - [x] buyCryptocurrency/sellCryptocurrency(userId, cryptoId, amount, accountType, accountId)
  - [x] createTransaction(fromAccountId, fromAccountType, toAccountId, toAccountType, amount, assetType, description)
  - [x] createLoan(playerId, amount)
  - [x] repayLoan(loanId, amount)
  - [x] addToCart(userId, productId, quantity)
  - [x] removeFromCart(userId, productId)
  - [x] checkout(userId, accountType, accountId)
  - [x] makeCompanySaleOffer(companyId, buyerId, offeredPrice)
  - [x] respondToCompanySaleOffer(offerId, response, counterOffer?)
- [x] 1.3. Write Convex query functions:
  - [x] getPlayer(playerId)
  - [x] getPlayerBalance(playerId)
  - [x] getPlayerNetWorth(playerId)
  - [x] getPlayerCompanies(playerId)
  - [x] getPlayerTransactionHistory(playerId, limit)
  - [x] getPlayerStockHoldings(playerId)
  - [x] getPlayerCryptoHoldings(playerId)
  - [x] getPlayerLoans(playerId)
  - [x] getPlayerCart(userId)
  - [x] getCompany(companyId)
  - [x] getCompanyProducts(companyId)
  - [x] getAllPublicCompanies()
  - [x] getCompanyStockInfo(companyId)
  - [x] getPlayerCompanyOwnership(playerId, companyId)
  - [x] getAllPlayers(sortBy: 'netWorth' | 'balance')
  - [x] getTopPlayers(limit, sortBy)
  - [x] getAllCryptocurrencies()
  - [x] getCryptocurrency(cryptoId)
  - [x] getAllProducts()
  - [x] searchProducts(query)
  - [x] getCompanySaleOffers(companyId)
  - [x] getPlayerPendingOffers(playerId)
- [x] 1.4. Write Convex action for 20-minute bot tick:
  - [x] executeTick() - runs every 20 minutes
  - [x] Query all active products
  - [x] Bot purchases based on attractiveness algorithm (AUTO_PRODUCT_ALGO.md)
  - [x] Distribute revenue to companies
  - [x] Update stock prices based on company performance (STOCK_MARKET_ALGO.md)
  - [x] Update crypto prices based on market activity (CRYPTO_MARKET_ALGO.md)
  - [x] Apply loan interest rates to all active loans
  - [x] Create marketplace sale records for all bot purchases
  - [x] Record tick history
- [x] 1.5. Write tests for all Convex functions (vitest)
  - [x] Test player creation and balance updates
  - [x] Test company creation and management
  - [x] Test stock holdings
  - [x] Test transaction creation
  - [x] Test loan creation and repayment
  - [x] Test bot tick logic
  - [x] Run: `npm run test` to confirm all tests pass (33 tests passing)

---

### 2. Player Dashboard

- [x] 2.1. Create Player Dashboard Layout component (route: /dashboard)
  - [x] Display player balance
  - [x] Display net worth
  - [x] Display countdown timer to next tick (20 minutes)
  - [x] Create countdown timer utility function with vitest tests
- [x] 2.2. Create Net Worth Breakdown visualizer:
  - [x] Horizontal stacked bar chart showing: Cash, Portfolio Value, Crypto Value, Equity (company ownership)
  - [x] Use shadcn Card component with custom horizontal bar
  - [x] Calculate each component dynamically with percentage display
  - [x] Write vitest tests for calculation logic (7 tests for breakdown calculations)
- [x] 2.3. Create Quick Actions section:
  - [x] Four action buttons: Manage Companies, Browse Marketplace, Trade Stocks, View Accounts
  - [x] Route each to respective pages
  - [x] Write tests for route generation
- [x] 2.4. Create Latest Transactions display:
  - [x] Show 5 most recent transactions
  - [x] Display: transaction type, amount, description, timestamp
  - [x] Use shadcn Table component
  - [x] Write vitest tests for sorting/filtering logic
- [x] 2.5. Write vitest tests for:
  - [x] Dashboard data fetching
  - [x] Net worth calculation
  - [x] Countdown timer accuracy
  - [x] Transaction sorting
  - [x] Net worth breakdown calculations
  - [x] Run: `npm run test` to confirm all tests pass (51 tests passing)

**✅ SECTION 2 COMPLETE** - All dashboard components created and tested. Convex dev server configured and running.

---

### 3. Leaderboard

- [x] 3.1. Create Leaderboard Layout (route: /leaderboard)
  - [x] Create 4 sections at top (in cards):
    - [x] Top 5 players by balance
    - [x] Top 5 players by net worth
    - [x] Top 5 most valuable companies (market cap)
    - [x] Top 5 companies with most cash
- [x] 3.2. Create 3 full-table sections below (in tabs):
  - [x] All players sorted by net worth (table with columns: rank, player name, balance, net worth)
  - [x] All companies sorted by market cap (table with columns: rank, company name, ticker, market cap, balance)
  - [x] All products sorted by revenue (table with columns: rank, product name, company, total revenue, stock available)
- [x] 3.3. Add search/filter UI to each table (search inputs created)
- [x] 3.4. Use shadcn Table, Card, and Tabs components throughout
- [x] 3.5. Write vitest tests for:
  - [x] Top 5 calculations
  - [x] Sorting logic
  - [x] Search filtering
  - [x] Pagination
  - [x] Run: `npm run test` to confirm all tests pass (83 tests passing)
- [x] Created Convex leaderboard.ts with 10 query functions
- [x] Wired up all Convex queries to leaderboard UI
- [x] Implemented search/filter for all tables
- [x] All leaderboard tests passing (14 tests)

**✅ SECTION 3 COMPLETE** - Leaderboard page fully functional with Convex integration, search/filtering, and all tests passing.

---

### 4. Accounts Tab

- [x] 4.1. Create Accounts page (route: /accounts)
  - [x] Show personal account balance prominently at top
  - [x] Create list/grid showing each company the player owns
  - [x] For each company card: company logo, name, ticker, balance
  - [x] Display total company assets
- [x] 4.2. Use shadcn Card and skeleton components
- [x] 4.3. Write vitest tests for:
  - [x] Account balance display
  - [x] Company filtering
  - [x] Balance calculations
  - [x] Run: `npm run test` to confirm all tests pass (83 tests passing)
- [x] Created route at /accounts (nested under dashboard layout)
- [x] Implemented personal account balance display with prominent card
- [x] Created responsive grid showing all owned companies
- [x] Display company details: name, ticker, balance, market cap (if public)
- [x] Calculate and display total company assets
- [x] Loading states with skeleton components
- [x] Empty state when no companies exist
- [x] All accounts tests passing (18 tests)

**✅ SECTION 4 COMPLETE** - Accounts page fully functional with personal and company account displays, all tests passing.

---

### 5. Transfers Tab

- [ ] 5.1. Create Transfers page (route: /transfers)
- [ ] 5.2. Create "Send Money/Assets" form:
  - [ ] Dropdown to select "From Account" (Personal account + all owned companies)
  - [ ] Dropdown to select "To Account" (Other players or other companies)
  - [ ] Radio buttons to select asset type: Cash, Crypto, Stock Holdings
  - [ ] Input field for amount
  - [ ] Required description field
  - [ ] Submit button
- [ ] 5.3. Add validation:
  - [ ] Sufficient balance check
  - [ ] Account exists check
  - [ ] Minimum transfer amount
- [ ] 5.4. Create transfer history section below form:
  - [ ] Show recent transfers sent and received
  - [ ] Use shadcn Table component
- [ ] 5.5. Write vitest tests for:
  - [ ] Form validation
  - [ ] Balance verification
  - [ ] Transfer creation
  - [ ] Transfer history sorting
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 6. Transaction History

- [ ] 6.1. Create Transaction History page (route: /transactions)
- [ ] 6.2. Create account selector dropdown:
  - [ ] Personal account
  - [ ] Each owned company account
- [ ] 6.3. Create transaction table:
  - [ ] Columns: Date, Type, From, To, Amount, Asset Type, Description
  - [ ] Sort by recency (newest first)
  - [ ] Add pagination
  - [ ] Use shadcn Table component
- [ ] 6.4. Add filters:
  - [ ] Date range filter
  - [ ] Transaction type filter
  - [ ] Amount range filter
- [ ] 6.5. Write vitest tests for:
  - [ ] Account filtering
  - [ ] Transaction fetching
  - [ ] Sorting logic
  - [ ] Date filtering
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 7. Loans System

- [ ] 7.1. Create Loans page (route: /loans)
- [ ] 7.2. Create "Borrow Money" section:
  - [ ] Input field for loan amount (max: $5,000,000)
  - [ ] Display interest rate (5% per day)
  - [ ] Calculate and show projected cost
  - [ ] Submit button
  - [ ] Add validation (max amount, player balance check)
  - [ ] Show warning that loans auto-deduct and can go negative
- [ ] 7.3. Create "Repay Loan" section:
  - [ ] List of active loans with remaining balance and interest accrued
  - [ ] Input field to select loan and repayment amount
  - [ ] Quick "Pay Off" button to fully repay
  - [ ] Submit button
- [ ] 7.4. Create Loan History section:
  - [ ] Show 5 most recent loans
  - [ ] Display: loan amount, interest rate, remaining balance, status (active/paid off), creation date
  - [ ] Use shadcn Table component
- [ ] 7.5. Convex action for daily loan interest:
  - [ ] Runs daily (or check on each player login)
  - [ ] Calculate interest for each active loan (5% of remaining balance)
  - [ ] Auto-deduct from player account (even if it goes negative)
  - [ ] Update loan record
- [ ] 7.6. Write vitest tests for:
  - [ ] Loan creation and validation
  - [ ] Interest calculation
  - [ ] Loan repayment
  - [ ] Balance deduction logic
  - [ ] Loan history display
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 8. Manage Companies

- [ ] 8.1. Create Manage Companies page (route: /dashboard/companies)
- [ ] 8.2. Create "Create Company" modal:
  - [ ] Input: Company name
  - [ ] Input: Ticker (unique identifier)
  - [ ] Textarea: Description
  - [ ] Multi-select: Tags
  - [ ] File upload: Logo image
  - [ ] Validation for all fields
  - [ ] Create button
  - [ ] Deduct $0 from player (or cost TBD)
- [ ] 8.3. Create company cards display:
  - [ ] Show all companies owned by player
  - [ ] Each card displays: logo, company name, ticker, description
  - [ ] Each card has quick action buttons:
    - [ ] "Dashboard" button (route to company dashboard)
    - [ ] "Add Products" button
    - [ ] "Edit" button (opens edit modal)
    - [ ] "Delete" button (with confirmation)
  - [ ] Add "Make Public" button if company balance >= $50k
- [ ] 8.4. "Edit Company" modal:
  - [ ] Editable: name, ticker, description, tags, logo
  - [ ] Submit changes
  - [ ] Cancel button
- [ ] 8.5. "Make Public" flow:
  - [ ] Check balance >= $50k
  - [ ] Create stock listing
  - [ ] Update company isPublic flag
  - [ ] Show confirmation
- [ ] 8.6. Write vitest tests for:
  - [ ] Company creation validation
  - [ ] Ticker uniqueness
  - [ ] Company display
  - [ ] Edit functionality
  - [ ] Delete functionality
  - [ ] Make public checks
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 9. Company Dashboard

- [ ] 9.1. Create Company Dashboard page (route: /dashboard/companies/:companyId)
- [ ] 9.2. Top section with company info:
  - [ ] Display company logo
  - [ ] Display company name
  - [ ] Display ticker
  - [ ] Display description
- [ ] 9.3. Stats section:
  - [ ] Total revenue (sum of all product sales)
  - [ ] Total profits (revenue - production costs)
  - [ ] Costs to pay (upcoming production costs)
  - [ ] Use shadcn Card components
- [ ] 9.4. Profit/Revenue graph:
  - [ ] Line/area chart showing profit and revenue over time
  - [ ] Use shadcn Chart component
  - [ ] Write vitest tests for data aggregation
- [ ] 9.5. Products section:
  - [ ] Table with columns: Image, Name, Price, Description
  - [ ] Three action buttons per product: Edit, Delete, Pay Production Cost
  - [ ] Add "Add Product" button (opens modal)
- [ ] 9.6. "Add Product" modal:
  - [ ] Input: Product name (required)
  - [ ] Input: Description (required)
  - [ ] Input: Price (required)
  - [ ] File upload: Image (required)
  - [ ] Multi-select: Tags (optional)
  - [ ] On submit: Calculate production cost (35%-67% of price)
  - [ ] Deduct production cost from company balance
  - [ ] Create product listing
- [ ] 9.7. Top 5 products visualizer:
  - [ ] Bar chart showing best selling products by profit margin
  - [ ] Use shadcn Chart component
- [ ] 9.8. Company Assets section:
  - [ ] Display any crypto holdings (logo, ticker, amount, value)
  - [ ] Display any stock holdings (logo, ticker, amount, value)
  - [ ] Calculate total value
- [ ] 9.9. Quick Actions section:
  - [ ] Button: "Manage Products" (route to products section)
  - [ ] Button: "Distribute Dividends" (opens modal)
  - [ ] Button: "Sell Company" (opens modal)
  - [ ] Button: "Back to Manage Companies"
- [ ] 9.10. "Distribute Dividends" modal:
  - [ ] Input: amount to distribute
  - [ ] Validation: company has sufficient balance
  - [ ] Calculate share percentages for all shareholders
  - [ ] Create transactions for each shareholder
  - [ ] Deduct from company balance
- [ ] 9.11. "Sell Company" modal:
  - [ ] Input: asking price
  - [ ] Submit to create a company sale listing
  - [ ] Show current offers if any exist
- [ ] 9.12. Write vitest tests for:
  - [ ] Revenue/profit calculation
  - [ ] Product management
  - [ ] Dividend distribution logic
  - [ ] Chart data aggregation
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 10. Marketplace

- [ ] 10.1. Create Marketplace page (route: /marketplace)
- [ ] 10.2. Create product cards:
  - [ ] Product image
  - [ ] Product name
  - [ ] Description
  - [ ] Tags
  - [ ] Company logo and name
  - [ ] Price
  - [ ] Stock available
  - [ ] "Add to Cart" button with quantity selector
- [ ] 10.3. Create search/filter section:
  - [ ] Text search (product name, description)
  - [ ] Company filter (searchable dropdown)
  - [ ] Tag filter (multi-select)
  - [ ] Price range filter (min/max sliders)
  - [ ] Sort options: Price (asc/desc), Newest, Most Popular
- [ ] 10.4. Add to cart functionality:
  - [ ] Quantity input
  - [ ] Add to cart button
  - [ ] Show confirmation toast
- [ ] 10.5. Create Cart section:
  - [ ] Show cart items in table
  - [ ] Display: product image, name, quantity, unit price, total price
  - [ ] Ability to update quantity or remove items
  - [ ] Show total cart value
  - [ ] "Checkout" button
- [ ] 10.6. Checkout flow:
  - [ ] Account selector dropdown (personal or company accounts)
  - [ ] Payment method selector (cash or crypto)
  - [ ] If crypto: select which crypto to use
  - [ ] Show total price
  - [ ] Confirm button
  - [ ] On success: create cart items in database, create transactions, clear cart
- [ ] 10.7. Use shadcn Card, Input, Button components throughout
- [ ] 10.8. Write vitest tests for:
  - [ ] Search/filter logic
  - [ ] Cart operations (add, remove, update)
  - [ ] Price calculations
  - [ ] Checkout validation
  - [ ] Account balance verification
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 11. Stock Market Page

- [ ] 11.1. Create Stock Market page (route: /stocks)
- [ ] 11.2. Create stock cards:
  - [ ] Company logo
  - [ ] Company ticker
  - [ ] Company name (below ticker)
  - [ ] Small sparkline chart (1-hour price history)
  - [ ] Current stock price
  - [ ] Price change percentage (1-hour)
  - [ ] Market cap
  - [ ] Hover effect showing arrow to view details
- [ ] 11.3. Create search/sort section:
  - [ ] Text search (company name, ticker)
  - [ ] Sort options: Price (asc/desc), Market Cap (asc/desc), Change % (asc/desc), Newest
- [ ] 11.4. Use shadcn Card components for stock cards
- [ ] 11.5. Make cards clickable to route to stock detail page
- [ ] 11.6. Write vitest tests for:
  - [ ] Stock data fetching
  - [ ] Search/sort logic
  - [ ] Price change calculations
  - [ ] Sparkline data aggregation
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 12. Stock Detail Page

- [ ] 12.1. Create Stock Detail page (route: /stocks/:companyId)
- [ ] 12.2. Top section:
  - [ ] Company logo
  - [ ] Ticker
  - [ ] Company name (below ticker)
  - [ ] Company description
- [ ] 12.3. Stats section:
  - [ ] Stock price
  - [ ] Change percentage (based on selected timeframe)
  - [ ] Market cap
- [ ] 12.4. Stock price graph:
  - [ ] Line chart with candlestick style
  - [ ] Time frame selector buttons: 1H, 1D, 1W, 1M, 1Y, ALL
  - [ ] Default: 7D (1W)
  - [ ] Update graph based on selected timeframe
- [ ] 12.5. Left sidebar - Purchase box:
  - [ ] Account selector dropdown (personal or company)
  - [ ] Radio buttons: "Share Amount" or "Dollar Amount"
  - [ ] Input field for quantity/amount
  - [ ] Show estimated total cost/shares
  - [ ] "Purchase" button with validation
  - [ ] Show transaction confirmation
- [ ] 12.6. Ownership visualizer (below graph):
  - [ ] Pie or donut chart showing percentage ownership
  - [ ] List showing each holder with name and percentage
  - [ ] Only show top 10 holders
- [ ] 12.7. Recent trades history (below graph):
  - [ ] Table showing: time, shares, price per share, total value
  - [ ] Anonymous (no names)
  - [ ] Most recent first
  - [ ] Use shadcn Table component
- [ ] 12.8. Write vitest tests for:
  - [ ] Stock price calculations
  - [ ] Purchase validation
  - [ ] Balance checks
  - [ ] Ownership calculations
  - [ ] Chart data for different timeframes
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 13. Cryptocurrency System

- [ ] 13.1. Create Crypto Market page (route: /crypto)
- [ ] 13.2. Create "Create Cryptocurrency" section:
  - [ ] Cost: $10,000 (deducted from player balance)
  - [ ] Initial volume: 100,000,000 tokens
  - [ ] Input: Crypto name
  - [ ] Input: Ticker (format: *XXX where X is a letter, max 3 characters total after *)
  - [ ] Textarea: Description
  - [ ] File upload: Image
  - [ ] Validation for ticker format and uniqueness
  - [ ] Create button
- [ ] 13.3. Create crypto cards (similar to stock market):
  - [ ] Crypto logo
  - [ ] Crypto ticker
  - [ ] Crypto name (below ticker)
  - [ ] Small sparkline chart (1-hour price history)
  - [ ] Current price
  - [ ] Price change percentage (1-hour)
  - [ ] Market cap
  - [ ] Hover arrow effect
- [ ] 13.4. Create search/sort section:
  - [ ] Text search (crypto name, ticker)
  - [ ] Sort options: Price (asc/desc), Market Cap (asc/desc), Change % (asc/desc)
- [ ] 13.5. Make cards clickable to route to crypto detail page
- [ ] 13.6. Write vitest tests for:
  - [ ] Crypto creation validation (ticker format, balance)
  - [ ] Unique ticker enforcement
  - [ ] Search/sort logic
  - [ ] Price calculations
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 14. Cryptocurrency Detail Page

- [ ] 14.1. Create Crypto Detail page (route: /crypto/:cryptoId)
- [ ] 14.2. Layout similar to Stock Detail:
  - [ ] Creator info at top (logo if needed, name)
  - [ ] Crypto ticker
  - [ ] Crypto name
  - [ ] Description
- [ ] 14.3. Stats section:
  - [ ] Price
  - [ ] Change percentage
  - [ ] Market cap
  - [ ] Volume
- [ ] 14.4. Price graph:
  - [ ] Line chart
  - [ ] Time frame selector: 1H, 1D, 1W, 1M, 1Y, ALL
  - [ ] Default: 7D
- [ ] 14.5. Left sidebar - Purchase box:
  - [ ] Account selector dropdown
  - [ ] Radio buttons: "Token Amount" or "Dollar Amount"
  - [ ] Input field
  - [ ] Show estimated total cost/tokens
  - [ ] "Purchase" button
  - [ ] Show confirmation
- [ ] 14.6. Ownership visualizer:
  - [ ] Pie chart showing top holders
  - [ ] List of holdings
- [ ] 14.7. Recent trades history:
  - [ ] Table with: time, tokens, price per token, total value
  - [ ] Anonymous
  - [ ] Most recent first
- [ ] 14.8. Write vitest tests for:
  - [ ] Crypto price calculations
  - [ ] Purchase validation
  - [ ] Ownership calculations
  - [ ] Chart data aggregation
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 15. Portfolio Page

- [ ] 15.1. Create Portfolio page (route: /portfolio)
- [ ] 15.2. Top section:
  - [ ] Display total net worth prominently
- [ ] 15.3. Stocks section:
  - [ ] Card showing total stocks value
  - [ ] Table with columns: Company Logo, Ticker, Money Value, Number of Shares
  - [ ] Add row "Total" at bottom with sum
  - [ ] Sortable by value, shares, ticker
  - [ ] Use shadcn Table component
- [ ] 15.4. Crypto section:
  - [ ] Card showing total crypto value
  - [ ] Table with columns: Crypto Logo, Ticker, Token Amount, Money Value
  - [ ] Add row "Total" at bottom
  - [ ] Sortable
  - [ ] Use shadcn Table component
- [ ] 15.5. Collections section (marketplace items):
  - [ ] Grid or table showing: Item image, Item name, Quantity Owned, Description, Total Value
  - [ ] Sortable by value, quantity, name
- [ ] 15.6. Write vitest tests for:
  - [ ] Portfolio data fetching
  - [ ] Value calculations
  - [ ] Sorting logic
  - [ ] Total calculations
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 16. Company Sales System

- [ ] 16.1. Create Company Sales page (route: /company-sales)
- [ ] 16.2. Create "Companies for Sale" section:
  - [ ] List all companies currently for sale
  - [ ] Display: company logo, name, ticker, current asking price, owner name
  - [ ] "Make Offer" button for each
- [ ] 16.3. "Make Offer" modal:
  - [ ] Show company details
  - [ ] Show current asking price
  - [ ] Input field for offer price
  - [ ] Submit button
  - [ ] Creates a CompanySaleOffer record
- [ ] 16.4. Create "My Sale Offers" section:
  - [ ] Show all sale offers for companies owned by player
  - [ ] For each offer: offeror name, offered price, status (pending/accepted/rejected/countered)
  - [ ] If status is "countered": show counter offer price
  - [ ] "Accept" button
  - [ ] "Reject" button
  - [ ] "Counter Offer" button (opens modal with input for counter price)
- [ ] 16.5. Pop-up notification system:
  - [ ] When player receives a new offer, show pop-up
  - [ ] Pop-up shows: offeror name, company name, offered price
  - [ ] "Accept", "Reject", or "Counter" buttons on pop-up
  - [ ] Pop-up persists until action taken or page closed
  - [ ] On page load, check for pending offers and show pop-ups
- [ ] 16.6. Integration with Manage Companies:
  - [ ] Show "Sell" button on company cards
  - [ ] Clicking "Sell" opens a modal to set asking price
- [ ] 16.7. Write vitest tests for:
  - [ ] Offer creation
  - [ ] Offer acceptance logic
  - [ ] Counter offer logic
  - [ ] Pop-up notification generation
  - [ ] Sale completion and ownership transfer
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 17. Gamble Tab

- [ ] 17.1. Create Gamble page (route: /gamble)
- [ ] 17.2. Display current balance (personal account only) prominently
- [ ] 17.3. Create Slot Machine game:
  - [ ] Three reels with spinning animation
  - [ ] Bet input field (minimum: $1, maximum: current balance)
  - [ ] "Spin" button
  - [ ] Win logic: matching symbols
  - [ ] Show payout multiplier
  - [ ] Auto-deduct bet and add winnings
- [ ] 17.4. Create Blackjack game:
  - [ ] Deal initial cards (player and dealer)
  - [ ] "Hit", "Stand", "Double Down", "Split" buttons
  - [ ] Show card values
  - [ ] Dealer AI (hits on 16, stands on 17+)
  - [ ] Win/loss logic
  - [ ] Bet input field
- [ ] 17.5. Create Dice Roll game:
  - [ ] Bet input field
  - [ ] Two dice display
  - [ ] "Roll" button
  - [ ] Win condition: player selects outcome (odd/even, over/under, specific number)
  - [ ] Calculate payout based on odds
- [ ] 17.6. Create Roulette game:
  - [ ] Visual roulette wheel (with spinning animation)
  - [ ] Betting table (red/black, odd/even, specific numbers, ranges)
  - [ ] Bet input field
  - [ ] "Spin" button
  - [ ] Show result and payout
- [ ] 17.7. Use shadcn Button, Input, Card components
- [ ] 17.8. Balance auto-updates after each game (only from personal account)
- [ ] 17.9. Prevent betting more than current balance
- [ ] 17.10. Write vitest tests for:
  - [ ] Game win/loss logic
  - [ ] Payout calculations
  - [ ] Balance deductions
  - [ ] Bet validation
  - [ ] RNG fairness (if applicable)
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 18. Upgrades System

- [ ] 18.1. Create Upgrades page (route: /upgrades)
- [ ] 18.2. Create "Purchase Upgrades" section:
  - [ ] Display available upgrades (placeholder for now)
  - [ ] Each upgrade card shows: name, description, cost, benefits
  - [ ] "Purchase" button (if player has sufficient balance)
  - [ ] Use shadcn Card components
- [ ] 18.3. Create "My Upgrades" section:
  - [ ] Show all upgrades purchased by player
  - [ ] Each card shows: name, description, status (active/available to use)
  - [ ] "Use Upgrade" button (for certain types)
- [ ] 18.4. Upgrade types (placeholder):
  - [ ] Add at least 2 example upgrades with different costs
  - [ ] Example 1: "+10% Daily Interest Rate" - $50,000
  - [ ] Example 2: "+50% Stock Returns" - $100,000
- [ ] 18.5. Write vitest tests for:
  - [ ] Upgrade purchase validation
  - [ ] Balance deduction
  - [ ] Upgrade storage and retrieval
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 19. Bot Tick System (20-minute cycle)

- [ ] 19.1. Create server-side scheduler:
  - [ ] Execute bot tick every 20 minutes
  - [ ] Trigger using Convex scheduled functions or external cron
- [ ] 19.2. Tick logic:
  - [ ] Query all marketplace listings with available stock
  - [ ] For each product: bot purchases random quantity (1-100)
  - [ ] Calculate total revenue for each product
  - [ ] Distribute revenue to company (stock cost)
  - [ ] Update company balance and net worth
  - [ ] Update stock prices based on company performance
    - [ ] If company profitability increased: stock price +2-5%
    - [ ] If company profitability decreased: stock price -2-5%
  - [ ] Update crypto prices based on trading volume
    - [ ] Price adjustment: +/- (0.5% to 2%) based on buy/sell volume
  - [ ] Create transaction records for all bot purchases
  - [ ] Create Tick_History record with timestamp and details
  - [ ] Emit real-time event to all connected clients to update dashboards
- [ ] 19.3. Write vitest tests for:
  - [ ] Bot purchase logic
  - [ ] Revenue distribution
  - [ ] Price update calculations
  - [ ] Transaction creation
  - [ ] Run: `npm run test` to confirm all tests pass

---

### 20. Real-time Updates

- [ ] 20.1. Setup WebSocket or Convex real-time subscriptions
  - [ ] Subscribe to player balance changes
  - [ ] Subscribe to stock price changes
  - [ ] Subscribe to crypto price changes
  - [ ] Subscribe to tick events
- [ ] 20.2. Implement on client-side:
  - [ ] Dashboard refreshes on tick event
  - [ ] Stock prices update in real-time
  - [ ] Crypto prices update in real-time
  - [ ] New transactions appear immediately
- [ ] 20.3. Write vitest tests for:
  - [ ] Subscription creation
  - [ ] Event handling
  - [ ] Data updates

---

### 21. Routing & Navigation

- [ ] 21.1. Setup React Router with all routes:
  - [ ] /dashboard (player dashboard)
  - [ ] /leaderboard
  - [ ] /accounts
  - [ ] /transfers
  - [ ] /transactions
  - [ ] /loans
  - [ ] /dashboard/companies (manage companies)
  - [ ] /dashboard/companies/:companyId (company dashboard)
  - [ ] /marketplace
  - [ ] /stocks (stock market)
  - [ ] /stocks/:companyId (stock detail)
  - [ ] /crypto (crypto market)
  - [ ] /crypto/:cryptoId (crypto detail)
  - [ ] /portfolio
  - [ ] /company-sales
  - [ ] /gamble
  - [ ] /upgrades
- [ ] 21.2. Create main navigation component with links to all pages
- [ ] 21.3. Write vitest tests for:
  - [ ] Route generation
  - [ ] Navigation links
  - [ ] Route params

---

### 22. User Authentication Integration

- [ ] 22.1. Integrate with existing auth system (sign-in/sign-up already exist)
- [ ] 22.2. On first login:
  - [ ] Create Player record in database
  - [ ] Initialize with $10,000 starting balance
  - [ ] Set initial net worth
- [ ] 22.3. Protect all routes (require authentication)
- [ ] 22.4. Write tests for:
  - [ ] First-time player initialization
  - [ ] Route protection
  - [ ] Session persistence

---

### 23. Type Safety & Testing Completion

- [ ] 23.1. Run full type checking:
  - [ ] `npm run type-check` or `tsc --noEmit`
  - [ ] Fix all TypeScript errors
  - [ ] Ensure no `any` types except where unavoidable
- [ ] 23.2. Run full test suite:
  - [ ] `npm run test`
  - [ ] Ensure 100% pass rate
  - [ ] Check coverage (aim for >80%)
- [ ] 23.3. Fix any remaining errors

---

## Phase 2: UI Refinement & Polish

### 1. Dashboard Polish
- [ ] Add animations to countdown timer
- [ ] Improve net worth breakdown chart styling
- [ ] Add hover effects to quick action buttons
- [ ] Animate transaction list entry

### 2. Leaderboard Polish
- [ ] Add rank badges
- [ ] Improve table styling
- [ ] Add pagination animations
- [ ] Add loading states

### 3. Company Dashboard Polish
- [ ] Add company header with gradient background
- [ ] Improve product table layout
- [ ] Add product image previews
- [ ] Animate chart data updates

### 4. Marketplace Polish
- [ ] Improve product card layout
- [ ] Add product image hover zoom
- [ ] Animate cart updates
- [ ] Improve checkout flow with steps

### 5. Stock & Crypto Pages Polish
- [ ] Improve chart styling with gradients
- [ ] Add technical indicators
- [ ] Improve ownership pie chart
- [ ] Add trading animations

### 6. Portfolio Polish
- [ ] Add portfolio breakdown visualization
- [ ] Improve table styling
- [ ] Add allocation percentages

### 7. Gamble Tab Polish
- [ ] Add flashing animations (not cringe)
- [ ] Improve casino aesthetic
- [ ] Add win/loss animations
- [ ] Add sound effects (optional)
- [ ] Improve roulette wheel animation

### 8. Global Styling
- [ ] Apply consistent spacing
- [ ] Improve color scheme
- [ ] Add dark mode support
- [ ] Ensure responsive design for mobile

### 9. Final Type Checking & Tests
- [ ] `npm run type-check`
- [ ] `npm run test`
- [ ] Ensure all tests still pass

---

## Final Checklist

- [ ] Phase 1 complete with all features functional
- [ ] All vitest tests passing
- [ ] Type checking passes (`npm run type-check`)
- [ ] No console errors or warnings
- [ ] All routes working
- [ ] Real-time updates working
- [ ] Bot tick system running correctly every 20 minutes
- [ ] Phase 2 UI refinements complete
- [ ] Final test run: `npm run test` - ALL PASSING
- [ ] Final type check: `npm run type-check` - NO ERRORS
- [ ] Ready for deployment

---

## Notes
- Use shadcn UI components exclusively for Phase 1 (don't reinvent wheels)
- Focus on functionality first, style second
- Write tests as you go, not at the end
- Commit frequently with meaningful commit messages
- Run type check and tests before each commit in Phase 1
