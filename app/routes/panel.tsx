import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Route } from "./+types/panel";
import { useState } from "react";
import type { Id } from "convex/_generated/dataModel";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Moderation Panel - Quickbuck" },
    { name: "description", content: "Moderation and admin panel" },
  ];
}

export default function Panel() {
  // @ts-ignore - moderation API will be available after Convex regenerates types
  const moderationAccess = useQuery(api.moderation?.checkModerationAccess);
  // @ts-ignore
  const players = useQuery(api.moderation?.getAllPlayersForModeration, {});
  // @ts-ignore
  const companies = useQuery(api.moderation?.getAllCompaniesForModeration);
  // @ts-ignore
  const cryptos = useQuery(api.moderation?.getAllCryptosForModeration);
  // @ts-ignore
  const products = useQuery(api.moderation?.getAllProductsForModeration);

  // @ts-ignore
  const limitPlayer = useMutation(api.moderation?.limitPlayer);
  // @ts-ignore
  const unlimitPlayer = useMutation(api.moderation?.unlimitPlayer);
  // @ts-ignore
  const warnPlayer = useMutation(api.moderation?.warnPlayer);
  // @ts-ignore
  const clearWarnings = useMutation(api.moderation?.clearWarnings);
  // @ts-ignore
  const removeWarning = useMutation(api.moderation?.removeWarning);
  // @ts-ignore
  const banPlayer = useMutation(api.moderation?.banPlayer);
  // @ts-ignore
  const unbanPlayer = useMutation(api.moderation?.unbanPlayer);
  // @ts-ignore
  const assignModerator = useMutation(api.moderation?.assignModerator);
  // @ts-ignore
  const removeModerator = useMutation(api.moderation?.removeModerator);
  // @ts-ignore
  const deleteCompany = useMutation(api.moderation?.deleteCompanyAsMod);
  // @ts-ignore
  const deleteProduct = useMutation(api.moderation?.deleteProductAsMod);
  // @ts-ignore
  const bulkDeleteProducts = useMutation(api.moderation?.bulkDeleteProducts);
  // @ts-ignore
  const deleteCrypto = useMutation(api.moderation?.deleteCryptoAsMod);
  // @ts-ignore
  const setPlayerBalance = useMutation(api.moderation?.setPlayerBalance);
  // @ts-ignore
  const setCompanyBalance = useMutation(api.moderation?.setCompanyBalance);

  // Alert mutations and queries
  // @ts-ignore
  const sendGlobalAlert = useMutation(api.alerts?.sendGlobalAlert);
  // @ts-ignore
  const getAllAlerts = useQuery(api.alerts?.getAllAlerts);
  // @ts-ignore
  const deleteAlert = useMutation(api.alerts?.deleteAlert);

  // Crypto mutations
  const createCrypto = useMutation(api.crypto.createCryptocurrency);
  const updateCryptoParams = useMutation(api.crypto.updateCryptoParameters);

  const [activeTab, setActiveTab] = useState<
    "players" | "companies" | "products" | "crypto" | "alerts"
  >("players");
  const [actionMessage, setActionMessage] = useState<string>("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertForm, setAlertForm] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "success" | "error",
  });
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);
  const [warningModal, setWarningModal] = useState<{
    playerId: Id<"players">;
    playerName: string;
  } | null>(null);
  const [warningReason, setWarningReason] = useState<string>("");
  const [viewWarningsModal, setViewWarningsModal] = useState<{
    playerId: Id<"players">;
    playerName: string;
    warnings: Array<{ reason: string; createdAt: number }>;
  } | null>(null);
  const [showCreateCryptoModal, setShowCreateCryptoModal] = useState(false);
  const [cryptoForm, setCryptoForm] = useState({
    name: "",
    symbol: "",
    initialSupply: "",
    initialPrice: "",
    liquidity: "",
    baseVolatility: "",
  });

  // Bulk product selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<Id<"products">>>(
    new Set()
  );
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");

  const showMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(""), 5000);
  };

  const toggleProductSelection = (productId: Id<"products">) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const getFilteredProducts = () => {
    if (!products?.products) return [];

    if (!productSearchQuery.trim()) {
      return products.products;
    }

    const query = productSearchQuery.toLowerCase();
    return products.products.filter(
      (p: any) =>
        p.name.toLowerCase().includes(query) ||
        p.companyName.toLowerCase().includes(query)
    );
  };

  const toggleAllProducts = () => {
    const filtered = getFilteredProducts();
    if (!filtered || filtered.length === 0) return;

    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set());
    } else {
      const allIds = new Set(filtered.map((p: any) => p._id));
      setSelectedProducts(allIds);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteReason.trim()) {
      showMessage("✗ Please enter a reason for deletion");
      return;
    }

    if (selectedProducts.size === 0) {
      showMessage("✗ No products selected");
      return;
    }

    try {
      const result = await bulkDeleteProducts({
        productIds: Array.from(selectedProducts),
        reason: bulkDeleteReason,
      });

      showMessage(`✓ ${result.message}`);
      setSelectedProducts(new Set());
      setShowBulkDeleteModal(false);
      setBulkDeleteReason("");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  if (moderationAccess === undefined) {
    return (
      <div className="retro-panel">
        <div className="retro-loading">
          <div className="retro-spinner"></div>
          <p>LOADING MODERATION PANEL...</p>
          <p className="retro-dots">...</p>
        </div>
      </div>
    );
  }

  if (!moderationAccess.hasAccess) {
    return (
      <div className="retro-panel">
        <div className="retro-access-denied">
          <h1>⛔ ACCESS DENIED ⛔</h1>
          <p>You do not have permission to access this panel.</p>
          <p>This area is restricted to moderators and administrators only.</p>
          <a href="/dashboard" className="retro-button">
            Return to Dashboard
          </a>
        </div>

        <style>{`
          .retro-panel {
            min-height: 100vh;
            background: #c0c0c0;
            font-family: "MS Sans Serif", "Tahoma", sans-serif;
            padding: 20px;
          }

          .retro-access-denied {
            max-width: 600px;
            margin: 100px auto;
            background: #ffffff;
            border: 3px solid #000000;
            padding: 30px;
            box-shadow: 5px 5px 0 #808080;
            text-align: center;
          }

          .retro-access-denied h1 {
            color: #ff0000;
            font-size: 32px;
            margin-bottom: 20px;
            text-shadow: 2px 2px #800000;
          }

          .retro-access-denied p {
            font-size: 16px;
            margin: 10px 0;
            color: #000000;
          }

          .retro-button {
            display: inline-block;
            margin-top: 20px;
            padding: 8px 16px;
            background: #c0c0c0;
            border: 2px outset #ffffff;
            color: #000000;
            text-decoration: none;
            font-weight: bold;
            cursor: pointer;
          }

          .retro-button:hover {
            background: #a0a0a0;
          }

          .retro-button:active {
            border-style: inset;
          }

          .retro-loading {
            text-align: center;
            padding: 100px;
            font-size: 24px;
            color: #000080;
          }
        `}</style>
      </div>
    );
  }

  const isAdmin = moderationAccess.role === "admin";

  const handleLimitPlayer = async (playerId: Id<"players">) => {
    const reason = prompt("Enter reason for limiting this account:");
    if (!reason) return;
    try {
      await limitPlayer({ targetPlayerId: playerId, reason });
      showMessage("✓ Player account limited");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleUnlimitPlayer = async (playerId: Id<"players">) => {
    try {
      await unlimitPlayer({ targetPlayerId: playerId });
      showMessage("✓ Player account restored");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleWarnPlayer = (playerId: Id<"players">, playerName: string) => {
    setWarningModal({ playerId, playerName });
    setWarningReason("");
  };

  const submitWarning = async () => {
    if (!warningModal || !warningReason.trim()) {
      showMessage("✗ Please enter a reason");
      return;
    }
    try {
      await warnPlayer({
        targetPlayerId: warningModal.playerId,
        reason: warningReason,
      });
      showMessage(`✓ ${warningModal.playerName} has been warned`);
      setWarningModal(null);
      setWarningReason("");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleBanPlayer = async (playerId: Id<"players">) => {
    const reason = prompt("Enter reason for banning this player:");
    if (!reason) return;
    try {
      await banPlayer({ targetPlayerId: playerId, reason });
      showMessage("✓ Player banned");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleUnbanPlayer = async (playerId: Id<"players">) => {
    try {
      await unbanPlayer({ targetPlayerId: playerId });
      showMessage("✓ Player unbanned");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleAssignMod = async (playerId: Id<"players">) => {
    if (!confirm("Promote this player to moderator?")) return;
    try {
      await assignModerator({ targetPlayerId: playerId });
      showMessage("✓ Player promoted to moderator");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleRemoveMod = async (playerId: Id<"players">) => {
    if (!confirm("Demote this moderator to normal user?")) return;
    try {
      await removeModerator({ targetPlayerId: playerId });
      showMessage("✓ Moderator demoted");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleClearWarnings = async (playerId: Id<"players">) => {
    if (!confirm("Clear all warnings for this player?")) return;
    try {
      await clearWarnings({ targetPlayerId: playerId });
      showMessage("✓ All warnings cleared");
      setViewWarningsModal(null);
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleRemoveWarning = async (
    playerId: Id<"players">,
    warningIndex: number
  ) => {
    if (!confirm("Remove this warning?")) return;
    try {
      await removeWarning({ targetPlayerId: playerId, warningIndex });
      showMessage("✓ Warning removed");
      // Close and reopen the modal to refresh warnings
      setViewWarningsModal(null);
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleViewWarnings = (player: any) => {
    setViewWarningsModal({
      playerId: player._id,
      playerName: player.userName,
      warnings: player.warnings || [],
    });
  };

  const handleDeleteCompany = async (companyId: Id<"companies">) => {
    const reason = prompt("Enter reason for deleting this company:");
    if (!reason) return;
    try {
      await deleteCompany({ companyId, reason });
      showMessage("✓ Company deleted");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleDeleteCrypto = async (cryptoId: Id<"cryptocurrencies">) => {
    const reason = prompt("Enter reason for deleting this crypto:");
    if (!reason) return;
    try {
      await deleteCrypto({ cryptoId, reason });
      showMessage("✓ Cryptocurrency deleted");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleCreateCrypto = async () => {
    if (
      !cryptoForm.name ||
      !cryptoForm.symbol ||
      !cryptoForm.initialSupply ||
      !cryptoForm.initialPrice
    ) {
      showMessage("✗ Please fill in all required fields");
      return;
    }

    try {
      const initialSupply = parseFloat(cryptoForm.initialSupply);
      const initialPrice = parseFloat(cryptoForm.initialPrice) * 100; // Convert to cents
      const liquidity = cryptoForm.liquidity
        ? parseFloat(cryptoForm.liquidity)
        : undefined;
      const baseVolatility = cryptoForm.baseVolatility
        ? parseFloat(cryptoForm.baseVolatility)
        : undefined;

      await createCrypto({
        name: cryptoForm.name,
        symbol: cryptoForm.symbol.toUpperCase(),
        initialSupply,
        initialPrice,
        liquidity,
        baseVolatility,
      });

      showMessage("✓ Cryptocurrency created successfully");
      setShowCreateCryptoModal(false);
      setCryptoForm({
        name: "",
        symbol: "",
        initialSupply: "",
        initialPrice: "",
        liquidity: "",
        baseVolatility: "",
      });
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleDeleteProduct = async (productId: Id<"products">) => {
    const reason = prompt("Enter reason for deleting this product:");
    if (!reason) return;
    try {
      await deleteProduct({ productId, reason });
      showMessage("✓ Product deleted");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleSetPlayerBalance = async (playerId: Id<"players">) => {
    const balanceStr = prompt("Enter new balance (in dollars):");
    if (!balanceStr) return;
    const balance = parseFloat(balanceStr);
    if (isNaN(balance) || balance < 0) {
      showMessage("✗ Invalid balance");
      return;
    }
    try {
      await setPlayerBalance({
        targetPlayerId: playerId,
        newBalance: Math.floor(balance * 100),
      });
      showMessage("✓ Player balance updated");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  const handleSetCompanyBalance = async (companyId: Id<"companies">) => {
    const balanceStr = prompt("Enter new balance (in dollars):");
    if (!balanceStr) return;
    const balance = parseFloat(balanceStr);
    if (isNaN(balance) || balance < 0) {
      showMessage("✗ Invalid balance");
      return;
    }
    try {
      await setCompanyBalance({
        companyId,
        newBalance: Math.floor(balance * 100),
      });
      showMessage("✓ Company balance updated");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  // Alert handler
  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.title.trim() || !alertForm.message.trim()) {
      showMessage("✗ Please fill in all fields");
      return;
    }
    if (alertForm.title.length > 200) {
      showMessage("✗ Title must be 200 characters or less");
      return;
    }
    if (alertForm.message.length > 2000) {
      showMessage("✗ Message must be 2000 characters or less");
      return;
    }
    setIsSubmittingAlert(true);
    try {
      await sendGlobalAlert({
        title: alertForm.title,
        message: alertForm.message,
        type: alertForm.type,
      });
      showMessage("✓ Global alert sent successfully!");
      setShowAlertModal(false);
      setAlertForm({ title: "", message: "", type: "info" });
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    } finally {
      setIsSubmittingAlert(false);
    }
  };

  // Delete alert handler
  const handleDeleteAlert = async (alertId: Id<"globalAlerts">) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) {
      return;
    }
    try {
      await deleteAlert({ alertId });
      showMessage("✓ Alert deleted successfully!");
    } catch (e: any) {
      showMessage("✗ Error: " + e.message);
    }
  };

  return (
    <div className="retro-panel">
      <div className="retro-header">
        <h1>🛡️ QUICKBUCK MODERATION PANEL 🛡️</h1>
        <div className="role-badge">
          You are logged in as:{" "}
          <strong>{moderationAccess.role.toUpperCase()}</strong>
        </div>
        <a href="/dashboard" className="retro-button">
          Back to Dashboard
        </a>
      </div>

      {actionMessage && <div className="action-message">{actionMessage}</div>}

      <div className="retro-tabs">
        <button
          className={`retro-tab ${activeTab === "players" ? "active" : ""}`}
          onClick={() => setActiveTab("players")}
        >
          Players
        </button>
        <button
          className={`retro-tab ${activeTab === "companies" ? "active" : ""}`}
          onClick={() => setActiveTab("companies")}
        >
          Companies
        </button>
        <button
          className={`retro-tab ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          Products
        </button>
        <button
          className={`retro-tab ${activeTab === "crypto" ? "active" : ""}`}
          onClick={() => setActiveTab("crypto")}
        >
          Cryptocurrencies
        </button>
        {isAdmin && (
          <button
            className={`retro-tab ${activeTab === "alerts" ? "active" : ""}`}
            onClick={() => setActiveTab("alerts")}
          >
            Global Alerts
          </button>
        )}
      </div>

      <div className="retro-content">
        {activeTab === "players" && (
          <div className="players-section">
            <h2>Player Management</h2>
            {players === undefined ? (
              <div className="loading">Loading players...</div>
            ) : players.length === 0 ? (
              <div className="no-data">No players found</div>
            ) : (
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Balance</th>
                    <th>Warnings</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => (
                    <tr key={player._id}>
                      <td>{player.userName}</td>
                      <td>{player.userEmail}</td>
                      <td>
                        <span
                          className={`role-tag role-${player.role || "normal"}`}
                        >
                          {(player.role || "normal").toUpperCase()}
                        </span>
                      </td>
                      <td>${(player.balance / 100).toFixed(2)}</td>
                      <td>
                        {player.warningCount ? (
                          <span
                            className="warning-count clickable"
                            title="Click to view warnings"
                            onClick={() => handleViewWarnings(player)}
                          >
                            ⚠️ {player.warningCount}
                          </span>
                        ) : (
                          <span className="no-warnings">—</span>
                        )}
                      </td>
                      <td>
                        {player.role === "banned" && player.banReason && (
                          <div className="status-info">
                            Banned: {player.banReason}
                          </div>
                        )}
                        {player.role === "limited" && player.limitReason && (
                          <div className="status-info">
                            Limited: {player.limitReason}
                          </div>
                        )}
                        {player.role !== "banned" &&
                          player.role !== "limited" && (
                            <span className="status-ok">OK</span>
                          )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {(player.role === "normal" || !player.role) && (
                            <>
                              <button
                                onClick={() =>
                                  handleWarnPlayer(player._id, player.userName)
                                }
                                className="btn-small btn-warn"
                                title="Issue a warning"
                              >
                                ⚠️
                              </button>
                              {(player.warningCount ?? 0) > 0 && (
                                <button
                                  onClick={() =>
                                    handleClearWarnings(player._id)
                                  }
                                  className="btn-small btn-info"
                                  title="Clear all warnings"
                                >
                                  Clear ⚠️
                                </button>
                              )}
                              <button
                                onClick={() => handleLimitPlayer(player._id)}
                                className="btn-small btn-warn"
                              >
                                Limit
                              </button>
                              <button
                                onClick={() => handleBanPlayer(player._id)}
                                className="btn-small btn-danger"
                              >
                                Ban
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleAssignMod(player._id)}
                                  className="btn-small btn-success"
                                >
                                  → Mod
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() =>
                                    handleSetPlayerBalance(player._id)
                                  }
                                  className="btn-small btn-info"
                                >
                                  Set $
                                </button>
                              )}
                            </>
                          )}
                          {player.role === "limited" && (
                            <>
                              <button
                                onClick={() =>
                                  handleWarnPlayer(player._id, player.userName)
                                }
                                className="btn-small btn-warn"
                                title="Issue a warning"
                              >
                                ⚠️
                              </button>
                              {(player.warningCount ?? 0) > 0 && (
                                <button
                                  onClick={() =>
                                    handleClearWarnings(player._id)
                                  }
                                  className="btn-small btn-info"
                                  title="Clear all warnings"
                                >
                                  Clear ⚠️
                                </button>
                              )}
                              <button
                                onClick={() => handleUnlimitPlayer(player._id)}
                                className="btn-small btn-success"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => handleBanPlayer(player._id)}
                                className="btn-small btn-danger"
                              >
                                Ban
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() =>
                                    handleSetPlayerBalance(player._id)
                                  }
                                  className="btn-small btn-info"
                                >
                                  Set $
                                </button>
                              )}
                            </>
                          )}
                          {player.role === "banned" && (
                            <>
                              <button
                                onClick={() => handleUnbanPlayer(player._id)}
                                className="btn-small btn-success"
                              >
                                Unban
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() =>
                                    handleSetPlayerBalance(player._id)
                                  }
                                  className="btn-small btn-info"
                                >
                                  Set $
                                </button>
                              )}
                            </>
                          )}
                          {player.role === "mod" && (
                            <>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => handleRemoveMod(player._id)}
                                    className="btn-small btn-warn"
                                  >
                                    Demote
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSetPlayerBalance(player._id)
                                    }
                                    className="btn-small btn-info"
                                  >
                                    Set $
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {player.role === "admin" && (
                            <span
                              className="role-tag role-admin"
                              style={{ fontSize: "10px" }}
                            >
                              ADMIN
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "companies" && (
          <div className="companies-section">
            <h2>Company Management</h2>
            {companies === undefined ? (
              <div className="loading">Loading companies...</div>
            ) : companies.length === 0 ? (
              <div className="no-data">No companies found</div>
            ) : (
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Owner</th>
                    <th>Ticker</th>
                    <th>Balance</th>
                    <th>Public</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company._id}>
                      <td>{company.name}</td>
                      <td>{company.ownerName}</td>
                      <td>{company.ticker || "—"}</td>
                      <td>${(company.balance / 100).toFixed(2)}</td>
                      <td>{company.isPublic ? "Yes" : "No"}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleDeleteCompany(company._id)}
                            className="btn-small btn-danger"
                          >
                            Delete
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() =>
                                handleSetCompanyBalance(company._id)
                              }
                              className="btn-small btn-info"
                            >
                              Set Balance
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "products" && (
          <div className="products-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0 }}>Product Management</h2>
              <input
                type="text"
                placeholder="Search products or companies..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                style={{
                  padding: "6px 10px",
                  border: "2px inset #dfdfdf",
                  fontFamily: '"MS Sans Serif", "Tahoma", sans-serif',
                  minWidth: "200px",
                  background: "#ffffff",
                }}
              />
              {selectedProducts.size > 0 && (
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="retro-button btn-danger"
                  style={{ fontSize: "14px" }}
                >
                  🗑️ Delete Selected ({selectedProducts.size})
                </button>
              )}
            </div>
            {products === undefined ? (
              <div className="loading">Loading products...</div>
            ) : !products.products || products.products.length === 0 ? (
              <div className="no-data">No products found</div>
            ) : getFilteredProducts().length === 0 ? (
              <div className="no-data">No products match your search</div>
            ) : (
              <table className="retro-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={
                          getFilteredProducts().length > 0 &&
                          selectedProducts.size === getFilteredProducts().length
                        }
                        onChange={toggleAllProducts}
                        style={{
                          cursor: "pointer",
                          width: "16px",
                          height: "16px",
                        }}
                      />
                    </th>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredProducts().map((product: any) => (
                    <tr
                      key={product._id}
                      style={{
                        backgroundColor: selectedProducts.has(product._id)
                          ? "#e6f7ff"
                          : "transparent",
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product._id)}
                          onChange={() => toggleProductSelection(product._id)}
                          style={{
                            cursor: "pointer",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                      </td>
                      <td>{product.name}</td>
                      <td>{product.companyName}</td>
                      <td>${(product.price / 100).toFixed(2)}</td>
                      <td>{product.stock ?? "∞"}</td>
                      <td>
                        {product.isActive ? (
                          <span className="status-ok">Active</span>
                        ) : (
                          <span className="status-info">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleDeleteProduct(product._id)}
                            className="btn-small btn-danger"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "crypto" && (
          <div className="crypto-section">
            <div
              className="crypto-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2>Cryptocurrency Management</h2>
              {isAdmin && (
                <button
                  className="retro-button btn-primary"
                  onClick={() => setShowCreateCryptoModal(true)}
                >
                  ➕ Create Cryptocurrency
                </button>
              )}
            </div>
            {cryptos === undefined ? (
              <div className="loading">Loading cryptocurrencies...</div>
            ) : cryptos.length === 0 ? (
              <div className="no-data">No cryptocurrencies found</div>
            ) : (
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>Market Cap</th>
                    <th>Supply</th>
                    <th>Volatility</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cryptos.map((crypto) => (
                    <tr key={crypto._id}>
                      <td>{crypto.name}</td>
                      <td>
                        <strong>{crypto.symbol}</strong>
                      </td>
                      <td>${(crypto.currentPrice / 100).toFixed(4)}</td>
                      <td>${(crypto.marketCap / 100).toLocaleString()}</td>
                      <td>{crypto.circulatingSupply.toLocaleString()}</td>
                      <td>
                        {((crypto.baseVolatility || 0) * 100).toFixed(1)}%
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleDeleteCrypto(crypto._id)}
                            className="btn-small btn-danger"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="alerts-section">
            <div className="alerts-header">
              <h2>Global Alerts</h2>
              <button
                className="retro-button btn-primary"
                onClick={() => setShowAlertModal(true)}
              >
                ✉️ Send New Alert
              </button>
            </div>

            {getAllAlerts === undefined ? (
              <div className="loading">Loading alerts...</div>
            ) : getAllAlerts.length === 0 ? (
              <div className="no-data">No alerts sent yet</div>
            ) : (
              <div className="alerts-list">
                {getAllAlerts.map((alert: any) => (
                  <div
                    key={alert._id}
                    className={`alert-item alert-${alert.type}`}
                  >
                    <div className="alert-header">
                      <strong>{alert.title}</strong>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <span className="alert-type">
                          {alert.type.toUpperCase()}
                        </span>
                        <button
                          className="retro-button btn-small btn-danger"
                          onClick={() => handleDeleteAlert(alert._id)}
                          style={{ padding: "2px 8px", fontSize: "12px" }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <p className="alert-message">{alert.message}</p>
                    <div className="alert-footer">
                      <span className="alert-time">
                        {new Date(alert.sentAt).toLocaleString()}
                      </span>
                      <span className="alert-readers">
                        Read by {alert.readBy?.length || 0} players
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warning Modal */}
      <div className={`warning-modal-overlay ${warningModal ? "visible" : ""}`}>
        <div className="warning-modal-box">
          <h3>⚠️ Warn Player</h3>
          <label>
            Player: <strong>{warningModal?.playerName}</strong>
          </label>
          <label htmlFor="warning-reason">Reason for Warning:</label>
          <textarea
            id="warning-reason"
            value={warningReason}
            onChange={(e) => setWarningReason(e.target.value)}
            placeholder="Enter the reason for warning this player..."
          />
          <div className="warning-modal-buttons">
            <button
              className="btn-cancel"
              onClick={() => {
                setWarningModal(null);
                setWarningReason("");
              }}
            >
              Cancel
            </button>
            <button className="btn-submit" onClick={submitWarning}>
              Submit Warning
            </button>
          </div>
        </div>
      </div>

      {/* View Warnings Modal */}
      <div
        className={`warning-modal-overlay ${
          viewWarningsModal ? "visible" : ""
        }`}
      >
        <div className="warning-modal-box view-warnings-box">
          <h3>⚠️ Player Warnings</h3>
          <p>
            Player: <strong>{viewWarningsModal?.playerName}</strong>
          </p>
          <p>
            Total Warnings:{" "}
            <strong>{viewWarningsModal?.warnings.length || 0}</strong>
          </p>

          {viewWarningsModal && viewWarningsModal.warnings.length > 0 ? (
            <div className="warnings-list">
              {viewWarningsModal.warnings.map((warning, index) => (
                <div key={index} className="warning-item">
                  <div className="warning-header">
                    <span className="warning-number">Warning #{index + 1}</span>
                    <span className="warning-date">
                      {new Date(warning.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="warning-reason">{warning.reason}</div>
                  <button
                    onClick={() =>
                      handleRemoveWarning(viewWarningsModal.playerId, index)
                    }
                    className="btn-small btn-danger"
                    style={{ marginTop: "5px" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-warnings-text">No warnings on record</p>
          )}

          <div className="warning-modal-buttons">
            <button
              className="btn-cancel"
              onClick={() => setViewWarningsModal(null)}
            >
              Close
            </button>
            {viewWarningsModal && viewWarningsModal.warnings.length > 0 && (
              <button
                className="btn-danger-action"
                onClick={() => handleClearWarnings(viewWarningsModal.playerId)}
              >
                Clear All Warnings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global Alert Modal */}
      <div className={`alert-modal-overlay ${showAlertModal ? "visible" : ""}`}>
        <div className="alert-modal-box">
          <h3>📢 Send Global Alert</h3>
          <form onSubmit={handleSendAlert}>
            <label htmlFor="alert-title">Title (max 200 chars):</label>
            <input
              id="alert-title"
              type="text"
              value={alertForm.title}
              onChange={(e) =>
                setAlertForm({ ...alertForm, title: e.target.value })
              }
              placeholder="Enter alert title..."
              maxLength={200}
            />
            <div className="char-count">{alertForm.title.length} / 200</div>

            <label htmlFor="alert-message">Message (max 2000 chars):</label>
            <textarea
              id="alert-message"
              value={alertForm.message}
              onChange={(e) =>
                setAlertForm({ ...alertForm, message: e.target.value })
              }
              placeholder="Enter alert message..."
              maxLength={2000}
              rows={8}
            />
            <div className="char-count">{alertForm.message.length} / 2000</div>

            <label htmlFor="alert-type">Alert Type:</label>
            <select
              id="alert-type"
              value={alertForm.type}
              onChange={(e) =>
                setAlertForm({
                  ...alertForm,
                  type: e.target.value as any,
                })
              }
            >
              <option value="info">ℹ️ Info</option>
              <option value="success">✓ Success</option>
              <option value="warning">⚠️ Warning</option>
              <option value="error">✗ Error</option>
            </select>

            <div className="alert-preview">
              <div className="alert-label">Preview:</div>
              <div className={`alert-item alert-${alertForm.type}`}>
                <div className="alert-header">
                  <strong>
                    {alertForm.title || "(Title will appear here)"}
                  </strong>
                  <span className="alert-type">
                    {alertForm.type.toUpperCase()}
                  </span>
                </div>
                <p className="alert-message">
                  {alertForm.message || "(Message will appear here)"}
                </p>
              </div>
            </div>

            <div className="alert-modal-buttons">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowAlertModal(false);
                  setAlertForm({ title: "", message: "", type: "info" });
                }}
                disabled={isSubmittingAlert}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmittingAlert}
              >
                {isSubmittingAlert ? "Sending..." : "Send Alert"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bulk Delete Modal */}
      <div
        className={`warning-modal-overlay ${
          showBulkDeleteModal ? "visible" : ""
        }`}
      >
        <div className="warning-modal-box">
          <h3>🗑️ Bulk Delete Products</h3>
          <p>
            You are about to delete <strong>{selectedProducts.size}</strong>{" "}
            product(s).
          </p>
          <p style={{ color: "#cc0000", fontWeight: "bold" }}>
            ⚠️ This action cannot be undone!
          </p>
          <label htmlFor="bulk-delete-reason">Reason for Deletion:</label>
          <textarea
            id="bulk-delete-reason"
            value={bulkDeleteReason}
            onChange={(e) => setBulkDeleteReason(e.target.value)}
            placeholder="Enter the reason for deleting these products..."
            rows={4}
          />
          <div className="warning-modal-buttons">
            <button
              className="btn-cancel"
              onClick={() => {
                setShowBulkDeleteModal(false);
                setBulkDeleteReason("");
              }}
            >
              Cancel
            </button>
            <button
              className="btn-submit btn-danger"
              onClick={handleBulkDelete}
            >
              Delete {selectedProducts.size} Product(s)
            </button>
          </div>
        </div>
      </div>

      {/* Create Crypto Modal */}
      <div
        className={`warning-modal-overlay ${
          showCreateCryptoModal ? "visible" : ""
        }`}
      >
        <div className="warning-modal-box" style={{ maxWidth: "600px" }}>
          <h3>🪙 Create New Cryptocurrency</h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <div>
              <label htmlFor="crypto-name">Name *</label>
              <input
                id="crypto-name"
                type="text"
                value={cryptoForm.name}
                onChange={(e) =>
                  setCryptoForm({ ...cryptoForm, name: e.target.value })
                }
                placeholder="e.g., GameCoin"
              />
            </div>
            <div>
              <label htmlFor="crypto-symbol">Symbol *</label>
              <input
                id="crypto-symbol"
                type="text"
                value={cryptoForm.symbol}
                onChange={(e) =>
                  setCryptoForm({
                    ...cryptoForm,
                    symbol: e.target.value.toUpperCase(),
                  })
                }
                placeholder="e.g., GMC"
                maxLength={6}
              />
            </div>
            <div>
              <label htmlFor="crypto-supply">Initial Supply *</label>
              <input
                id="crypto-supply"
                type="number"
                value={cryptoForm.initialSupply}
                onChange={(e) =>
                  setCryptoForm({
                    ...cryptoForm,
                    initialSupply: e.target.value,
                  })
                }
                placeholder="e.g., 1000000"
                min="1"
              />
            </div>
            <div>
              <label htmlFor="crypto-price">Initial Price (USD) *</label>
              <input
                id="crypto-price"
                type="number"
                value={cryptoForm.initialPrice}
                onChange={(e) =>
                  setCryptoForm({ ...cryptoForm, initialPrice: e.target.value })
                }
                placeholder="e.g., 1.00"
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="crypto-liquidity">
                Liquidity Pool (optional)
              </label>
              <input
                id="crypto-liquidity"
                type="number"
                value={cryptoForm.liquidity}
                onChange={(e) =>
                  setCryptoForm({ ...cryptoForm, liquidity: e.target.value })
                }
                placeholder="Default: 10% of supply"
                min="1"
              />
              <small style={{ color: "#666", fontSize: "12px" }}>
                Controls price impact from trades
              </small>
            </div>
            <div>
              <label htmlFor="crypto-volatility">
                Base Volatility (optional)
              </label>
              <input
                id="crypto-volatility"
                type="number"
                value={cryptoForm.baseVolatility}
                onChange={(e) =>
                  setCryptoForm({
                    ...cryptoForm,
                    baseVolatility: e.target.value,
                  })
                }
                placeholder="Default: 0.1 (10%)"
                min="0.01"
                max="1"
                step="0.01"
              />
              <small style={{ color: "#666", fontSize: "12px" }}>
                Daily volatility factor (0.05-0.2 recommended)
              </small>
            </div>
          </div>
          <div className="warning-modal-buttons" style={{ marginTop: "20px" }}>
            <button
              className="btn-cancel"
              onClick={() => {
                setShowCreateCryptoModal(false);
                setCryptoForm({
                  name: "",
                  symbol: "",
                  initialSupply: "",
                  initialPrice: "",
                  liquidity: "",
                  baseVolatility: "",
                });
              }}
            >
              Cancel
            </button>
            <button className="btn-submit" onClick={handleCreateCrypto}>
              Create Cryptocurrency
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .retro-panel {
          min-height: 100vh;
          background: #008080;
          font-family: "MS Sans Serif", "Tahoma", sans-serif;
          padding: 20px;
        }

        .retro-header {
          background: #000080;
          color: #ffffff;
          padding: 15px;
          margin-bottom: 20px;
          border: 3px ridge #ffffff;
          text-align: center;
        }

        .retro-header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
          text-shadow: 2px 2px #000000;
        }

        .role-badge {
          margin: 10px 0;
          font-size: 14px;
        }

        .retro-button {
          display: inline-block;
          margin-top: 10px;
          padding: 6px 12px;
          background: #c0c0c0;
          border: 2px outset #ffffff;
          color: #000000;
          text-decoration: none;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        }

        .retro-button:hover {
          background: #a0a0a0;
        }

        .retro-button:active {
          border-style: inset;
        }

        .action-message {
          background: #ffff00;
          border: 3px solid #000000;
          padding: 10px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: bold;
          box-shadow: 3px 3px 0 #808080;
        }

        .retro-tabs {
          display: flex;
          gap: 5px;
          margin-bottom: 10px;
        }

        .retro-tab {
          flex: 1;
          padding: 10px;
          background: #c0c0c0;
          border: 2px outset #ffffff;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
        }

        .retro-tab:hover {
          background: #d0d0d0;
        }

        .retro-tab.active {
          background: #ffffff;
          border-style: inset;
        }

        .retro-content {
          background: #ffffff;
          border: 3px ridge #808080;
          padding: 20px;
          min-height: 500px;
        }

        .retro-content h2 {
          color: #000080;
          border-bottom: 2px solid #000080;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }

        .retro-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000000;
          background: #ffffff;
        }

        .retro-table th {
          background: #000080;
          color: #ffffff;
          padding: 8px;
          text-align: left;
          border: 1px solid #000000;
          font-weight: bold;
        }

        .retro-table td {
          padding: 8px;
          border: 1px solid #c0c0c0;
        }

        .retro-table tbody tr:nth-child(even) {
          background: #f0f0f0;
        }

        .retro-table tbody tr:hover {
          background: #ffffcc;
        }

        .role-tag {
          display: inline-block;
          padding: 2px 8px;
          border: 2px solid;
          font-size: 11px;
          font-weight: bold;
        }

        .role-normal {
          background: #c0c0c0;
          border-color: #808080;
          color: #000000;
        }

        .role-limited {
          background: #ffff00;
          border-color: #ff8c00;
          color: #000000;
        }

        .role-banned {
          background: #ff0000;
          border-color: #800000;
          color: #ffffff;
        }

        .role-mod {
          background: #00ff00;
          border-color: #008000;
          color: #000000;
        }

        .role-admin {
          background: #ff00ff;
          border-color: #800080;
          color: #ffffff;
        }

        .status-info {
          font-size: 12px;
          color: #800000;
        }

        .status-ok {
          color: #008000;
          font-weight: bold;
        }

        .action-buttons {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }

        .btn-small {
          padding: 4px 8px;
          font-size: 11px;
          border: 2px outset #ffffff;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-small:hover {
          filter: brightness(1.1);
        }

        .btn-small:active {
          border-style: inset;
        }

        .btn-warn {
          background: #ffff00;
          color: #000000;
        }

        .btn-danger {
          background: #ff0000;
          color: #ffffff;
        }

        .btn-success {
          background: #00ff00;
          color: #000000;
        }

        .btn-info {
          background: #00ffff;
          color: #000000;
        }

        .loading, .no-data {
          text-align: center;
          padding: 40px;
          color: #808080;
          font-style: italic;
        }

        .warning-modal-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .warning-modal-overlay.visible {
          display: flex;
        }

        .warning-modal-box {
          background: #c0c0c0;
          border: 3px solid #000000;
          padding: 20px;
          max-width: 400px;
          width: 90%;
          box-shadow: 5px 5px 0 #808080;
        }

        .view-warnings-box {
          max-width: 600px;
        }

        .warning-modal-box h3 {
          margin-top: 0;
          color: #000080;
          font-size: 16px;
        }

        .warning-modal-box label {
          display: block;
          margin: 15px 0 5px 0;
          font-weight: bold;
          color: #000000;
        }

        .warning-modal-box input[type="text"],
        .warning-modal-box textarea {
          width: 100%;
          padding: 5px;
          font-family: "MS Sans Serif", "Tahoma", sans-serif;
          border: 2px inset #dfdfdf;
          background: #ffffff;
          color: #000000;
          box-sizing: border-box;
        }

        .warning-modal-box textarea {
          resize: vertical;
          min-height: 80px;
        }

        .warning-modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .warning-modal-buttons button {
          padding: 6px 16px;
          background: #c0c0c0;
          border: 2px outset #dfdfdf;
          cursor: pointer;
          font-weight: bold;
          font-family: "MS Sans Serif", "Tahoma", sans-serif;
        }

        .warning-modal-buttons button:hover {
          filter: brightness(1.1);
        }

        .warning-modal-buttons button:active {
          border-style: inset;
        }

        .warning-modal-buttons .btn-submit {
          background: #00ff00;
          border-color: #008000;
        }

        .warning-modal-buttons .btn-cancel {
          background: #ff0000;
          border-color: #800000;
          color: #ffffff;
        }

        .warning-modal-buttons .btn-danger-action {
          background: #ff0000;
          border-color: #800000;
          color: #ffffff;
        }

        .warnings-list {
          max-height: 400px;
          overflow-y: auto;
          margin: 15px 0;
          border: 2px inset #dfdfdf;
          background: #ffffff;
          padding: 10px;
        }

        .warning-item {
          background: #ffffe0;
          border: 2px solid #ffa500;
          padding: 10px;
          margin-bottom: 10px;
        }

        .warning-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-weight: bold;
        }

        .warning-number {
          color: #ff0000;
        }

        .warning-date {
          color: #808080;
          font-size: 12px;
        }

        .warning-reason {
          color: #000000;
          margin-bottom: 5px;
          padding: 5px;
          background: #ffffff;
          border: 1px solid #c0c0c0;
        }

        .no-warnings-text {
          text-align: center;
          color: #808080;
          font-style: italic;
          padding: 20px;
        }

        .warning-count {
          color: #ff8c00;
          font-weight: bold;
        }

        .warning-count.clickable {
          cursor: pointer;
          text-decoration: underline;
        }

        .warning-count.clickable:hover {
          color: #ff0000;
        }

        .no-warnings {
          color: #808080;
        }

        /* Alert Modal Styles */
        .alert-modal-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .alert-modal-overlay.visible {
          display: flex;
        }

        .alert-modal-box {
          background: #c0c0c0;
          border: 3px solid #000000;
          padding: 20px;
          max-width: 600px;
          width: 90%;
          box-shadow: 5px 5px 0 #808080;
          max-height: 90vh;
          overflow-y: auto;
        }

        .alert-modal-box h3 {
          margin-top: 0;
          color: #000080;
          font-size: 16px;
        }

        .alert-modal-box label {
          display: block;
          margin: 15px 0 5px 0;
          font-weight: bold;
          color: #000000;
        }

        .alert-modal-box input[type="text"],
        .alert-modal-box textarea,
        .alert-modal-box select {
          width: 100%;
          padding: 5px;
          font-family: "MS Sans Serif", "Tahoma", sans-serif;
          border: 2px inset #dfdfdf;
          background: #ffffff;
          color: #000000;
          box-sizing: border-box;
          margin-bottom: 5px;
        }

        .alert-modal-box textarea {
          resize: vertical;
          min-height: 120px;
        }

        .char-count {
          font-size: 11px;
          color: #808080;
          text-align: right;
          margin-bottom: 10px;
        }

        .alert-preview {
          margin: 20px 0;
          padding: 10px;
          background: #f0f0f0;
          border: 2px inset #dfdfdf;
        }

        .alert-preview .alert-label {
          font-weight: bold;
          margin-bottom: 10px;
          color: #000080;
        }

        .alert-modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .alert-modal-buttons button {
          padding: 6px 16px;
          background: #c0c0c0;
          border: 2px outset #dfdfdf;
          cursor: pointer;
          font-weight: bold;
          font-family: "MS Sans Serif", "Tahoma", sans-serif;
        }

        .alert-modal-buttons button:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .alert-modal-buttons button:active:not(:disabled) {
          border-style: inset;
        }

        .alert-modal-buttons button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert-modal-buttons .btn-submit {
          background: #00ff00;
          border-color: #008000;
        }

        .alert-modal-buttons .btn-cancel {
          background: #ff0000;
          border-color: #800000;
          color: #ffffff;
        }

        /* Alerts Section Styles */
        .alerts-section h2 {
          color: #000080;
          border-bottom: 2px solid #000080;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }

        .alerts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .alerts-header h2 {
          margin: 0;
          flex: 1;
        }

        .alerts-header button {
          white-space: nowrap;
        }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .alert-item {
          border: 2px solid;
          padding: 12px;
          border-radius: 2px;
          background: #ffffff;
        }

        .alert-item.alert-info {
          border-color: #0000ff;
          background: #e6f2ff;
        }

        .alert-item.alert-success {
          border-color: #008000;
          background: #e6ffe6;
        }

        .alert-item.alert-warning {
          border-color: #ff8c00;
          background: #fff9e6;
        }

        .alert-item.alert-error {
          border-color: #ff0000;
          background: #ffe6e6;
        }

        .alert-item .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 8px;
        }

        .alert-item .alert-header strong {
          color: #000000;
          font-size: 14px;
        }

        .alert-type {
          display: inline-block;
          font-size: 11px;
          font-weight: bold;
          padding: 2px 6px;
          background: #c0c0c0;
          border: 1px solid #808080;
        }

        .alert-item.alert-info .alert-type {
          background: #0000ff;
          color: #ffffff;
        }

        .alert-item.alert-success .alert-type {
          background: #008000;
          color: #ffffff;
        }

        .alert-item.alert-warning .alert-type {
          background: #ff8c00;
          color: #ffffff;
        }

        .alert-item.alert-error .alert-type {
          background: #ff0000;
          color: #ffffff;
        }

        .alert-message {
          margin: 8px 0;
          color: #000000;
          white-space: pre-wrap;
          word-wrap: break-word;
          line-height: 1.4;
        }

        .alert-footer {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #808080;
          margin-top: 8px;
          border-top: 1px solid #c0c0c0;
          padding-top: 8px;
        }

        .btn-primary {
          background: #0080ff;
          border-color: #0000ff;
          color: #ffffff;
        }

        .btn-primary:hover {
          background: #0060df;
        }
      `}</style>
    </div>
  );
}
