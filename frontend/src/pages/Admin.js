import React, { useState, useEffect } from "react";
import {
  Users,
  Globe,
  Clock,
  Activity,
  Shield,
  Key,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Save,
  LogOut // 🔬 TAMBAHAN: Ikon untuk tombol Kick User
} from "lucide-react";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [sessions, setSessions] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    id: null,
    username: "",
    password: "",
    role: "viewer",
  });

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === "sessions") {
        const res = await fetch(
          `http://${window.location.hostname}:3001/api/admin/sessions`,
          { headers },
        );
        if (res.ok) setSessions(await res.json());
      } else {
        const res = await fetch(
          `http://${window.location.hostname}:3001/api/admin/users`,
          { headers },
        );
        if (res.ok) setUsersList(await res.json());
      }
    } catch (err) {
      console.error("Gagal menarik data", err);
    }
  };

  useEffect(() => {
    fetchData();
    let interval;
    if (activeTab === "sessions") interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const showNotification = (msg, type = "success") => {
    setNotification({ show: true, message: msg, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  const openModal = (mode, user = null) => {
    setModalMode(mode);
    if (mode === "edit" && user) {
      setFormData({
        id: user.id,
        username: user.username,
        password: "",
        role: user.role,
      });
    } else {
      setFormData({ id: null, username: "", password: "", role: "viewer" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const url =
        modalMode === "add"
          ? `http://${window.location.hostname}:3001/api/admin/users`
          : `http://${window.location.hostname}:3001/api/admin/users/${formData.id}`;

      const method = modalMode === "add" ? "POST" : "PUT";
      const payload = { ...formData };
      
      if (modalMode === "edit" && !payload.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, "success");
        setIsModalOpen(false);
        fetchData();
      } else {
        showNotification(data.error, "error");
      }
    } catch (err) {
      showNotification("Terjadi kesalahan koneksi server.", "error");
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus akses untuk pengguna [${username}]?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://${window.location.hostname}:3001/api/admin/users/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, "success");
        fetchData();
      } else {
        showNotification(data.error, "error");
      }
    } catch (err) {
      showNotification("Gagal menghapus user.", "error");
    }
  };

  // 🔬 FITUR BARU: Fungsi untuk menghentikan paksa sesi user yang sedang login
  const handleKickUser = async (username) => {
    if (!window.confirm(`PERINGATAN: Apakah Anda yakin ingin menghentikan sesi (Force Logout) pengguna [${username}] secara real-time?`)) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://${window.location.hostname}:3001/api/admin/users/kick`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ username })
      });
      
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, "success");
        if (activeTab === 'sessions') fetchData(); // Refresh tabel sesi
      } else {
        showNotification(data.error, "error");
      }
    } catch (err) {
      showNotification("Gagal menghubungi server untuk menghentikan sesi.", "error");
    }
  };

  return (
    <div className="relative min-h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-emerald-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {notification.show && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl flex items-center gap-3 shadow-2xl backdrop-blur-md transform transition-all animate-fade-in-down border ${
            notification.type === "success"
              ? "bg-emerald-900/40 border-emerald-500/50 text-emerald-100"
              : "bg-red-900/40 border-red-500/50 text-red-100"
          }`}
        >
          {notification.type === "success" ? (
            <Check size={20} className="text-emerald-400" />
          ) : (
            <X size={20} className="text-red-400" />
          )}
          <span className="font-semibold text-sm tracking-wide">
            {notification.message}
          </span>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col relative z-10 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-200 tracking-wide uppercase">
                System Administrator
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
                User Access & Security Control Center
              </p>
            </div>
          </div>

          <div className="flex p-1 bg-black/40 rounded-xl backdrop-blur-md border border-white/5">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === "users"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <Users size={14} /> Accounts
            </button>
            <button
              onClick={() => setActiveTab("sessions")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === "sessions"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <Activity size={14} /> Access Log
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:border-white/20 transition-all duration-500 overflow-hidden relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

        {activeTab === "users" && (
          <div className="p-4 border-b border-white/10 flex justify-end bg-black/20">
            <button
              onClick={() => openModal("add")}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:scale-105"
            >
              <Plus size={16} /> New User
            </button>
          </div>
        )}

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0A0A0C]/90 backdrop-blur-xl z-10 border-b border-white/10">
              <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                {activeTab === "sessions" ? (
                  <>
                    <th className="p-4 pl-6">Timestamp</th>
                    <th className="p-4">Operator ID</th>
                    <th className="p-4">Role / Access</th>
                    <th className="p-4">Network IP</th>
                    {/* 🔬 PERBAIKAN: Kolom diubah menjadi Status / Action agar lebar untuk tombol Kick */}
                    <th className="p-4 pr-6 text-right">Status / Action</th>
                  </>
                ) : (
                  <>
                    <th className="p-4 pl-6">Operator ID</th>
                    <th className="p-4">Role / Authorization</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-mono text-gray-300">
              {activeTab === "sessions" &&
                sessions.map((session, idx) => (
                  <tr
                    key={session.id || idx}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4 pl-6 flex items-center gap-2.5 text-gray-300 whitespace-nowrap">
                      <Clock size={14} className="text-emerald-400/70" />
                      <span>{session.login_time}</span>
                    </td>
                    <td className="p-4 text-white font-bold tracking-wide">
                      {session.username}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          session.role === "admin"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : session.role === "operator"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            : session.role === "engineer"
                            ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                            : session.role === "supervisor"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-white/5 text-gray-400 border border-white/10"
                        }`}
                      >
                        <Shield size={10} />
                        {session.role || "viewer"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Globe size={14} className="text-blue-400/70" />
                        <span>{session.ip_address}</span>
                      </div>
                    </td>
                    {/* 🔬 PERBAIKAN: Sel tabel Status / Action dengan tombol KICK */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-widest">
                          <Activity size={12} className="animate-pulse" />
                          ACTIVE
                        </span>
                        
                        <button 
                          onClick={() => handleKickUser(session.username)}
                          className="p-1.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white rounded-lg border border-orange-500/30 transition-all opacity-50 group-hover:opacity-100 shadow-[0_0_10px_rgba(249,115,22,0.1)] hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transform hover:scale-105"
                          title={`Keluarkan (Force Logout) ${session.username}`}
                        >
                          <LogOut size={15} /> 
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {activeTab === "users" &&
                usersList.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-gray-600">
                          <Users size={14} className="text-gray-300" />
                        </div>
                        <span className="text-white font-bold tracking-wide">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          user.role === "admin"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : user.role === "operator"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            : user.role === "engineer"
                            ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                            : user.role === "supervisor"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-white/5 text-gray-400 border border-white/10"
                        }`}
                      >
                        <Shield size={10} />
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right opacity-50 group-hover:opacity-100 transition-opacity">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal("edit", user)}
                          className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg border border-blue-500/20 transition-colors"
                          title="Edit User"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteUser(user.id, user.username)
                          }
                          className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/20 transition-colors"
                          title="Hapus User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#12141C] border border-white/10 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
            <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-emerald-500/20 rounded-full blur-[50px]"></div>

            <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {modalMode === "add" ? (
                  <Plus className="text-emerald-400" />
                ) : (
                  <Edit2 className="text-blue-400" />
                )}
                {modalMode === "add" ? "Register New User" : "Edit User Access"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-5 relative z-10"
            >
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Users size={16} className="text-gray-500" />
                  </div>
                  <input
                    type="text"
                    required={modalMode === "add"}
                    disabled={modalMode === "edit"}
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full bg-black/30 border border-white/10 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-sm disabled:opacity-50"
                    placeholder="Enter operator ID"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  {modalMode === "edit"
                    ? "New Password (Kosongkan jika tidak diubah)"
                    : "Password"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key size={16} className="text-gray-500" />
                  </div>
                  <input
                    type="password"
                    required={modalMode === "add"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full bg-black/30 border border-white/10 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Role Level
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Shield size={16} className="text-gray-500" />
                  </div>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full bg-black/30 border border-white/10 text-white rounded-xl py-3 pl-11 pr-4 appearance-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-bold uppercase tracking-wider"
                  >
                    <option value="viewer" className="bg-gray-900">
                      VIEWER (Read Only)
                    </option>
                    <option value="operator" className="bg-gray-900">
                      OPERATOR (Write Access)
                    </option>
                    <option value="supervisor" className="bg-gray-900">
                      SUPERVISOR (Extended Access)
                    </option>
                    <option value="engineer" className="bg-gray-900">
                      ENGINEER (Parameter Level)
                    </option>
                    <option value="admin" className="bg-gray-900">
                      ADMIN (Full Access)
                    </option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm tracking-widest uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex justify-center items-center gap-2"
                >
                  <Save size={16} /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `,
        }}
      />
    </div>
  );
};

export default Admin;