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
  const deleteCrypto = useMutation(api.moderation?.deleteCryptoAsMod);
  // @ts-ignore
  const setPlayerBalance = useMutation(api.moderation?.setPlayerBalance);
  // @ts-ignore
  const setCompanyBalance = useMutation(api.moderation?.setCompanyBalance);

  const [activeTab, setActiveTab] = useState<
    "players" | "companies" | "products" | "crypto"
  >("players");
  const [actionMessage, setActionMessage] = useState<string>("");

  const showMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(""), 5000);
  };

  if (moderationAccess === undefined) {
    return (
      <div className="retro-panel">
        <div className="retro-loading">Loading...</div>
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

  const handleWarnPlayer = async (playerId: Id<"players">) => {
    const reason = prompt("Enter reason for warning this player:");
    if (!reason) return;
    try {
      await warnPlayer({ targetPlayerId: playerId, reason });
      showMessage("✓ Player warned");
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
                        <span className={`role-tag role-${player.role || "normal"}`}>
                          {(player.role || "normal").toUpperCase()}
                        </span>
                      </td>
                      <td>${(player.balance / 100).toFixed(2)}</td>
                      <td>
                        {player.warningCount ? (
                          <span className="warning-count" title="Click to see warnings">
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
                                onClick={() => handleWarnPlayer(player._id)}
                                className="btn-small btn-warn"
                                title="Issue a warning"
                              >
                                ⚠️
                              </button>
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
                                  onClick={() => handleSetPlayerBalance(player._id)}
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
                                onClick={() => handleWarnPlayer(player._id)}
                                className="btn-small btn-warn"
                                title="Issue a warning"
                              >
                                ⚠️
                              </button>
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
                                  onClick={() => handleSetPlayerBalance(player._id)}
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
                                  onClick={() => handleSetPlayerBalance(player._id)}
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
                                    onClick={() => handleSetPlayerBalance(player._id)}
                                    className="btn-small btn-info"
                                  >
                                    Set $
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {player.role === "admin" && (
                            <span className="role-tag role-admin" style={{fontSize: '10px'}}>ADMIN</span>
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
            <h2>Product Management</h2>
            {products === undefined ? (
              <div className="loading">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="no-data">No products found</div>
            ) : (
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: any) => (
                    <tr key={product._id}>
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
            <h2>Cryptocurrency Management</h2>
            {cryptos === undefined ? (
              <div className="loading">Loading cryptocurrencies...</div>
            ) : cryptos.length === 0 ? (
              <div className="no-data">No cryptocurrencies found</div>
            ) : (
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Ticker</th>
                    <th>Creator</th>
                    <th>Price</th>
                    <th>Market Cap</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cryptos.map((crypto) => (
                    <tr key={crypto._id}>
                      <td>{crypto.name}</td>
                      <td>{crypto.ticker}</td>
                      <td>{crypto.creatorName}</td>
                      <td>${(crypto.price / 100).toFixed(2)}</td>
                      <td>${(crypto.marketCap / 100).toFixed(2)}</td>
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
      `}</style>
    </div>
  );
}
