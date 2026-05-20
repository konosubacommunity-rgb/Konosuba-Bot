import { useState, useEffect } from "react";
import {
  Trash2, Shield, Search, AlertTriangle, RotateCcw, Users,
  Lock, LogOut, Eye, EyeOff, CheckCircle, AlertCircle, Loader
} from "lucide-react";

interface AdminUser {
  phone: string;
  name: string;
  username: string;
  wallet: number;
  bank: number;
  level: number;
  xp: number;
  registered: boolean;
  banned: boolean;
  createdAt: string;
}

interface AdminPanelProps {
  onClose?: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // User search
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUser | null>(null);
  const [searching, setSearching] = useState(false);

  // Users list
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Dangerous actions
  const [confirmReset, setConfirmReset] = useState("");
  const [confirmResetAll, setConfirmResetAll] = useState("");
  const [resetUserPhone, setResetUserPhone] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const headers = { "x-admin-password": adminPassword };

  const authenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!res.ok) throw new Error("Invalid password");

      setIsAuthenticated(true);
      setSuccess("Admin authenticated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;

    setSearching(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/users/search?phone=${encodeURIComponent(searchPhone)}`,
        { headers }
      );

      if (!res.ok) throw new Error("User not found");

      const data = await res.json();
      setSearchResults(data.user);
      setSuccess("User found!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  };

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers });

      if (!res.ok) throw new Error("Failed to load users");

      const data = await res.json();
      setUsers(data.users || []);
      setSuccess(`Loaded ${data.count} users`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const resetUserStats = async (phone: string) => {
    if (confirmReset !== "RESET") {
      setError("Please type RESET to confirm");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-user`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) throw new Error("Reset failed");

      const data = await res.json();
      setSuccess(data.message);
      setConfirmReset("");
      setResetUserPhone("");
      setSearchResults(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (phone: string) => {
    if (confirmReset !== "DELETE") {
      setError("Please type DELETE to confirm");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/delete-user`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) throw new Error("Delete failed");

      const data = await res.json();
      setSuccess(data.message);
      setConfirmReset("");
      setSearchResults(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const resetAllData = async () => {
    if (confirmResetAll !== "YES_DELETE_ALL_DATA") {
      setError('Please type "YES_DELETE_ALL_DATA" to confirm');
      return;
    }

    if (!window.confirm("⚠️ THIS WILL DELETE ALL USER DATA! This action cannot be undone. Continue?")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-users`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "YES_DELETE_ALL_DATA" }),
      });

      if (!res.ok) throw new Error("Reset all failed");

      const data = await res.json();
      setSuccess(data.message);
      setConfirmResetAll("");
      setUsers([]);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset all failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <style>{`
          .admin-login-container {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
            font-family: 'Poppins', sans-serif;
          }
          .admin-login-card {
            background: linear-gradient(135deg, rgba(79,195,247,0.1), rgba(200,100,255,0.1));
            border: 1px solid rgba(79,195,247,0.3);
            border-radius: 16px;
            padding: 2rem;
            width: 90%;
            max-width: 400px;
            backdrop-filter: blur(10px);
          }
          .admin-login-card h2 {
            color: #4fc3f7;
            margin: 0 0 1.5rem 0;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 24px;
          }
          .admin-form-group {
            display: flex;
            flex-direction: column;
            margin-bottom: 1.5rem;
          }
          .admin-form-group label {
            color: #aaa;
            font-size: 12px;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-weight: 600;
          }
          .admin-input {
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(79,195,247,0.2);
            border-radius: 8px;
            padding: 12px 14px;
            color: #fff;
            font-size: 14px;
            transition: all 0.3s;
          }
          .admin-input:focus {
            outline: none;
            border-color: #4fc3f7;
            background: rgba(255,255,255,0.12);
          }
          .password-group {
            position: relative;
          }
          .password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #aaa;
          }
          .admin-btn {
            background: linear-gradient(135deg, #4fc3f7, #2196f3);
            border: none;
            border-radius: 8px;
            padding: 12px;
            color: #fff;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .admin-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(79,195,247,0.3);
          }
          .admin-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .error-msg {
            background: rgba(244,67,54,0.15);
            border-left: 3px solid #f44336;
            padding: 12px;
            border-radius: 6px;
            color: #ff8a80;
            font-size: 13px;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 8px;
          }
        `}</style>

        <div className="admin-login-card">
          <h2>
            <Shield size={24} />
            Admin Access
          </h2>

          {error && (
            <div className="error-msg">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={authenticate}>
            <div className="admin-form-group">
              <label>Admin Password</label>
              <div className="password-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="admin-input"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                />
                <span
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            <button type="submit" className="admin-btn" disabled={loading}>
              {loading ? <Loader size={16} className="spin" /> : <Lock size={16} />}
              {loading ? "Authenticating..." : "Enter Admin Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-wrapper">
      <style>{`
        .admin-panel-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #0a0e27, #1a1f3a);
          overflow-y: auto;
          z-index: 9998;
          font-family: 'Poppins', sans-serif;
        }

        .admin-header {
          background: rgba(79,195,247,0.08);
          border-bottom: 1px solid rgba(79,195,247,0.2);
          padding: 1.5rem;
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .admin-header h1 {
          color: #4fc3f7;
          margin: 0;
          font-size: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-close-btn {
          background: rgba(244,67,54,0.2);
          border: 1px solid rgba(244,67,54,0.4);
          color: #ff6e6e;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .admin-close-btn:hover {
          background: rgba(244,67,54,0.4);
        }

        .admin-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .admin-section {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(79,195,247,0.15);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .admin-section h2 {
          color: #4fc3f7;
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
        }

        .search-form {
          display: flex;
          gap: 10px;
          margin-bottom: 1.5rem;
        }

        .admin-input {
          flex: 1;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(79,195,247,0.2);
          border-radius: 8px;
          padding: 10px 14px;
          color: #fff;
          font-size: 14px;
        }

        .admin-input:focus {
          outline: none;
          border-color: #4fc3f7;
          background: rgba(255,255,255,0.12);
        }

        .admin-btn {
          background: linear-gradient(135deg, #4fc3f7, #2196f3);
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .admin-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(79,195,247,0.3);
        }

        .admin-btn-danger {
          background: linear-gradient(135deg, #ff5252, #d32f2f);
        }

        .admin-btn-danger:hover {
          box-shadow: 0 8px 20px rgba(244,67,54,0.3);
        }

        .admin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .user-card {
          background: rgba(79,195,247,0.08);
          border: 1px solid rgba(79,195,247,0.2);
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .user-card-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1rem;
        }

        .user-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          font-size: 14px;
          margin-bottom: 1rem;
        }

        .user-info-item {
          display: flex;
          flex-direction: column;
        }

        .user-info-label {
          color: #999;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .user-info-value {
          color: #fff;
          font-weight: 600;
        }

        .user-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .user-small-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(79,195,247,0.2);
          color: #4fc3f7;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s;
        }

        .user-small-btn:hover {
          border-color: #4fc3f7;
          background: rgba(79,195,247,0.2);
        }

        .confirmation-input {
          display: flex;
          gap: 10px;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(79,195,247,0.1);
        }

        .success-msg {
          background: rgba(76,175,80,0.15);
          border-left: 3px solid #4caf50;
          padding: 12px;
          border-radius: 6px;
          color: #81c784;
          font-size: 13px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-msg {
          background: rgba(244,67,54,0.15);
          border-left: 3px solid #f44336;
          padding: 12px;
          border-radius: 6px;
          color: #ff8a80;
          font-size: 13px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .loading-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .warning-box {
          background: rgba(255,152,0,0.1);
          border-left: 3px solid #ffa726;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          color: #ffb74d;
          display: flex;
          gap: 10px;
        }
      `}</style>

      <div className="admin-header">
        <h1>
          <Shield size={28} />
          Admin Panel
        </h1>
        <button
          className="admin-close-btn"
          onClick={() => {
            setIsAuthenticated(false);
            setAdminPassword("");
            onClose?.();
          }}
        >
          <LogOut size={16} /> Exit
        </button>
      </div>

      <div className="admin-content">
        {error && (
          <div className="error-msg">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="success-msg">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {/* SEARCH USER */}
        <div className="admin-section">
          <h2>
            <Search size={18} />
            Search User
          </h2>
          <form className="search-form" onSubmit={searchUser}>
            <input
              type="text"
              className="admin-input"
              placeholder="Enter phone number..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
            <button type="submit" className="admin-btn" disabled={searching}>
              {searching && <Loader className="loading-spinner" size={16} />}
              Search
            </button>
          </form>

          {searchResults && (
            <div className="user-card">
              <div className="user-info">
                <div className="user-info-item">
                  <div className="user-info-label">Phone</div>
                  <div className="user-info-value">{searchResults.phone}</div>
                </div>
                <div className="user-info-item">
                  <div className="user-info-label">Username</div>
                  <div className="user-info-value">{searchResults.username || "N/A"}</div>
                </div>
                <div className="user-info-item">
                  <div className="user-info-label">Level</div>
                  <div className="user-info-value">{searchResults.level}</div>
                </div>
                <div className="user-info-item">
                  <div className="user-info-label">Wallet</div>
                  <div className="user-info-value">${searchResults.wallet}</div>
                </div>
                <div className="user-info-item">
                  <div className="user-info-label">Bank</div>
                  <div className="user-info-value">${searchResults.bank}</div>
                </div>
                <div className="user-info-item">
                  <div className="user-info-label">Status</div>
                  <div className="user-info-value">
                    {searchResults.banned ? "🚫 Banned" : "✅ Active"}
                  </div>
                </div>
              </div>

              <div className="user-actions">
                <button
                  className="user-small-btn"
                  onClick={() => {
                    setResetUserPhone(searchResults.phone);
                    setConfirmReset("");
                  }}
                >
                  <RotateCcw size={14} /> Reset Stats
                </button>
                <button
                  className="user-small-btn"
                  style={{ color: "#ff6e6e", borderColor: "rgba(244,67,54,0.4)" }}
                  onClick={() => {
                    setResetUserPhone(searchResults.phone);
                    setConfirmReset("");
                  }}
                >
                  <Trash2 size={14} /> Delete User
                </button>
              </div>

              {resetUserPhone === searchResults.phone && (
                <div className="confirmation-input">
                  <input
                    type="text"
                    className="admin-input"
                    placeholder='Type "RESET" or "DELETE" to confirm'
                    value={confirmReset}
                    onChange={(e) => setConfirmReset(e.target.value)}
                  />
                  <button
                    className="admin-btn"
                    onClick={() => resetUserStats(searchResults.phone)}
                    disabled={loading}
                  >
                    Reset
                  </button>
                  <button
                    className="admin-btn admin-btn-danger"
                    onClick={() => deleteUser(searchResults.phone)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ALL USERS */}
        <div className="admin-section">
          <h2>
            <Users size={18} />
            All Users ({users.length})
          </h2>
          <button className="admin-btn" onClick={loadAllUsers} disabled={loadingUsers}>
            {loadingUsers && <Loader className="loading-spinner" size={16} />}
            Load All Users
          </button>

          {users.length > 0 && (
            <div className="users-grid" style={{ marginTop: "1.5rem" }}>
              {users.map((user) => (
                <div key={user.phone} className="user-card">
                  <div className="user-card-header">
                    <div>
                      <div style={{ color: "#4fc3f7", fontWeight: "600" }}>
                        {user.username || user.name}
                      </div>
                      <div style={{ color: "#999", fontSize: "12px" }}>
                        {user.phone}
                      </div>
                    </div>
                    <div style={{ color: user.banned ? "#ff6e6e" : "#81c784" }}>
                      {user.banned ? "🚫" : "✅"}
                    </div>
                  </div>

                  <div className="user-info" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="user-info-item">
                      <div className="user-info-label">Level {user.level}</div>
                      <div style={{ color: "#aaa", fontSize: "12px" }}>
                        Wallet: ${user.wallet} | Bank: ${user.bank}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RESET ALL DATA - DANGEROUS */}
        <div className="admin-section">
          <h2 style={{ color: "#ff6e6e" }}>
            <AlertTriangle size={18} />
            ⚠️ RESET ALL DATA
          </h2>

          <div className="warning-box">
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>WARNING:</strong> This action will permanently delete ALL user data.
              Users will need to sign up again. This cannot be undone!
            </div>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <label style={{ color: "#aaa", display: "block", marginBottom: "8px", fontSize: "12px" }}>
              Type YES_DELETE_ALL_DATA to confirm:
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="admin-input"
                value={confirmResetAll}
                onChange={(e) => setConfirmResetAll(e.target.value)}
                placeholder='Type "YES_DELETE_ALL_DATA"'
              />
              <button
                className="admin-btn admin-btn-danger"
                onClick={resetAllData}
                disabled={loading || confirmResetAll !== "YES_DELETE_ALL_DATA"}
              >
                {loading && <Loader className="loading-spinner" size={16} />}
                Delete All Users
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
