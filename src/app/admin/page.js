"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Orders & UI states
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("reports"); // "reports", "menu", or "orders"
  const [toastMessage, setToastMessage] = useState("");
  const [notificationMsg, setNotificationMsg] = useState("");
  const lastSeenOrderIdRef = useRef(0);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };
  
  // Modal & Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // If not null, we are editing
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formImage, setFormImage] = useState("/images/espresso.jpg");
  const [formAvailable, setFormAvailable] = useState(true);
  const [formDescription, setFormDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const router = useRouter();

  // Calculate report metrics
  const getReportData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let todaySales = 0;
    let monthSales = 0;
    let completedOrdersCount = 0;
    let totalSalesValue = 0;
    
    const itemSalesCount = {};
    const dailySalesMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      dailySalesMap[dateStr] = 0;
    }

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const amount = order.totalAmount;
      const isCompleted = order.status === "COMPLETED" || order.status === "PAID";

      if (isCompleted) {
        totalSalesValue += amount;
        completedOrdersCount++;

        const compareDate = new Date(order.createdAt);
        compareDate.setHours(0, 0, 0, 0);
        if (compareDate.getTime() === today.getTime()) {
          todaySales += amount;
        }

        if (orderDate >= startOfMonth) {
          monthSales += amount;
        }

        const dateStr = orderDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        if (dailySalesMap[dateStr] !== undefined) {
          dailySalesMap[dateStr] += amount;
        }

        try {
          const items = JSON.parse(order.items);
          items.forEach(item => {
            const name = item.name;
            const qty = item.quantity || 1;
            itemSalesCount[name] = (itemSalesCount[name] || 0) + qty;
          });
        } catch (e) {
          console.error("Error parsing items:", e);
        }
      }
    });

    const averageOrderValue = completedOrdersCount > 0 ? Math.round(totalSalesValue / completedOrdersCount) : 0;
    const chartData = Object.entries(dailySalesMap).map(([label, value]) => ({ label, value }));
    const topSellingItems = Object.entries(itemSalesCount)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      todaySales,
      monthSales,
      completedOrdersCount,
      averageOrderValue,
      chartData,
      topSellingItems
    };
  };

  const reports = getReportData();

  // Beautiful self-contained AudioContext notification chime
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Tone 1: E5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      gain1.gain.setValueAtTime(0.1, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);
      
      // Tone 2: G5
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.4);
      }, 150);
    } catch (e) {
      console.error("AudioContext not supported or blocked by browser policy", e);
    }
  };

  // Fetch all orders
  const fetchOrders = async (isInitial = false) => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);

        if (data.length > 0) {
          const newestOrder = data[0];
          if (isInitial) {
            lastSeenOrderIdRef.current = newestOrder.id;
          } else if (newestOrder.id > lastSeenOrderIdRef.current) {
            playNotificationSound();
            setNotificationMsg(`🔔 Pesanan Baru Masuk: #${newestOrder.id} dari ${newestOrder.customerName} (${newestOrder.tableNumber})!`);
            lastSeenOrderIdRef.current = newestOrder.id;
            setTimeout(() => {
              setNotificationMsg("");
            }, 6000);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        triggerToast(`Pesanan #${orderId} diupdate menjadi ${newStatus}`);
      } else {
        triggerToast("Gagal memperbarui status pesanan");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Terjadi kesalahan koneksi");
    }
  };

  // Check auth and setup polling
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          sessionStorage.removeItem("isLoggedIn");
          sessionStorage.removeItem("adminUser");
          router.push("/login");
        } else {
          setAuthorized(true);
          fetchData();
          fetchOrders(true); // Ambil pesanan awal

          // Setup polling pesanan baru setiap 5 detik
          const interval = setInterval(() => {
            fetchOrders(false);
          }, 5000);

          return () => clearInterval(interval);
        }
      } catch (err) {
        console.error("Session verification error:", err);
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  // Fetch all menu items and categories
  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/categories")
      ]);

      if (menuRes.ok && catRes.ok) {
        const menuData = await menuRes.json();
        const catData = await catRes.json();
        setMenuItems(menuData);
        setCategories(catData);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Open Modal for adding new item
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName("");
    setFormPrice("");
    setFormCategory(categories[0]?.id || "");
    setFormImage("/images/espresso.jpg");
    setFormAvailable(true);
    setFormDescription("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  // Open Modal for editing item
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormPrice(item.price.toString());
    setFormCategory(item.categoryId.toString());
    setFormImage(item.image || "/images/espresso.jpg");
    setFormAvailable(item.available);
    setFormDescription(item.description || "");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  // Handle Image Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setFormImage(data.url);
        triggerToast("Gambar berhasil diunggah!");
      } else {
        setErrorMsg(data.error || "Gagal mengunggah gambar");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Koneksi bermasalah saat mengunggah");
    } finally {
      setUploading(false);
    }
  };

  // Handle Form Submit (Create or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const itemData = {
      name: formName,
      price: parseInt(formPrice),
      categoryId: parseInt(formCategory),
      image: formImage,
      available: formAvailable,
      description: formDescription
    };

    const url = editingItem ? `/api/menu/${editingItem.id}` : "/api/menu";
    const method = editingItem ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Gagal menyimpan menu");
      }
    } catch (err) {
      setErrorMsg("Koneksi bermasalah");
    }
  };

  // Toggle item availability status (In Stock / Out of Stock)
  const handleToggleAvailable = async (item) => {
    try {
      const res = await fetch(`/api/menu/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available })
      });

      if (res.ok) {
        // Optimistic UI update
        setMenuItems(menuItems.map(m => m.id === item.id ? { ...m, available: !m.available } : m));
      }
    } catch (err) {
      console.error("Gagal mengubah ketersediaan:", err);
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (itemId) => {
    if (!confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;

    try {
      const res = await fetch(`/api/menu/${itemId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setMenuItems(menuItems.filter(m => m.id !== itemId));
      }
    } catch (err) {
      console.error("Gagal menghapus menu:", err);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed:", e);
    }
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("adminUser");
    router.push("/login");
  };

  // Calculations for stats
  const totalMenuCount = menuItems.length;
  const totalCategoriesCount = categories.length;
  const outOfStockCount = menuItems.filter(m => !m.available).length;

  if (!authorized) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Memuat halaman...</div>;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span>🍽️</span> Admin Resto Rasa
        </div>
        <ul className="admin-nav">
          <li className={`admin-nav-item ${activeTab === "reports" ? "active" : ""}`}>
            <button 
              onClick={() => setActiveTab("reports")} 
              style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', display: 'flex', width: '100%', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', textAlign: 'left' }}
            >
              📊 Laporan Penjualan
            </button>
          </li>
          <li className={`admin-nav-item ${activeTab === "menu" ? "active" : ""}`}>
            <button 
              onClick={() => setActiveTab("menu")} 
              style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', display: 'flex', width: '100%', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', textAlign: 'left' }}
            >
              📋 Kelola Menu
            </button>
          </li>
          <li className={`admin-nav-item ${activeTab === "orders" ? "active" : ""}`}>
            <button 
              onClick={() => setActiveTab("orders")} 
              style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', display: 'flex', width: '100%', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', textAlign: 'left', justifyContent: 'space-between' }}
            >
              <span>🛒 Pesanan Masuk</span>
              {orders.filter(o => o.status === 'PENDING' || o.status === 'PAID').length > 0 && (
                <span style={{ backgroundColor: '#EF4444', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>
                  {orders.filter(o => o.status === 'PENDING' || o.status === 'PAID').length}
                </span>
              )}
            </button>
          </li>
          <li className="admin-nav-item">
            <Link href="/" style={{ display: 'block', padding: '12px 16px' }}>🌐 Halaman Pelanggan</Link>
          </li>
        </ul>
        <div className="admin-logout">
          <button className="admin-logout-btn" onClick={handleLogout}>
            🚪 Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          {activeTab === "reports" ? (
            <div className="admin-title-desc">
              <h1>Laporan Analisis Penjualan</h1>
              <p>Analisis tren transaksi, omzet pendapatan, dan daftar menu terlaris Anda.</p>
            </div>
          ) : activeTab === "menu" ? (
            <>
              <div className="admin-title-desc">
                <h1>Kelola Daftar Menu</h1>
                <p>Tambah, edit, hapus, dan atur ketersediaan menu Anda.</p>
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddModal}>
                ➕ Tambah Menu Baru
              </button>
            </>
          ) : (
            <div className="admin-title-desc">
              <h1>Kelola Pesanan Masuk</h1>
              <p>Pantau dan update status pembayaran serta penyajian hidangan pelanggan Anda.</p>
            </div>
          )}
        </header>

        {loading ? (
          <div>Sedang mengambil data terbaru...</div>
        ) : activeTab === "reports" ? (
          <>
            {/* Laporan Stats Grid */}
            <section className="admin-stats-grid">
              <div className="stat-card">
                <div className="stat-icon total-items" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>💰</div>
                <div className="stat-details">
                  <span>Omzet Hari Ini</span>
                  <h3>Rp {reports.todaySales.toLocaleString('id-ID')}</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon total-categories" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>📅</div>
                <div className="stat-details">
                  <span>Omzet Bulan Ini</span>
                  <h3>Rp {reports.monthSales.toLocaleString('id-ID')}</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon out-of-stock" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>🍽️</div>
                <div className="stat-details">
                  <span>Rata-rata Pesanan</span>
                  <h3>Rp {reports.averageOrderValue.toLocaleString('id-ID')}</h3>
                </div>
              </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
              {/* Sales Chart Card */}
              <div className="admin-card" style={{ padding: '24px' }}>
                <div className="admin-card-header" style={{ marginBottom: '20px' }}>
                  <h2>Tren Omzet 7 Hari Terakhir</h2>
                </div>
                <div style={{ position: 'relative', width: '100%', height: '240px', backgroundColor: '#fcfcfc', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px 10px 10px', boxSizing: 'border-box' }}>
                  {(() => {
                    const maxVal = Math.max(...reports.chartData.map(d => d.value), 50000);
                    const points = reports.chartData.map((d, idx) => {
                      const x = 50 + idx * 70;
                      const y = 170 - (d.value / maxVal) * 130;
                      return { x, y, label: d.label, val: d.value };
                    });

                    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaPath = linePath ? `${linePath} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z` : '';

                    return (
                      <svg width="100%" height="100%" viewBox="0 0 500 200" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
                          </linearGradient>
                        </defs>

                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const y = 170 - ratio * 130;
                          const gridVal = Math.round(ratio * maxVal);
                          return (
                            <g key={idx}>
                              <line x1="45" y1={y} x2="480" y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
                              <text x="35" y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">
                                {gridVal >= 1000000 ? `${(gridVal/1000000).toFixed(1)}M` : gridVal >= 1000 ? `${gridVal/1000}k` : gridVal}
                              </text>
                            </g>
                          );
                        })}

                        {areaPath && <path d={areaPath} fill="url(#chart-grad)" />}
                        {linePath && <path d={linePath} fill="none" stroke="var(--primary-dark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                        {points.map((p, idx) => (
                          <g key={idx} className="chart-dot-group">
                            <circle cx={p.x} cy={p.y} r="5" fill="var(--white)" stroke="var(--primary-dark)" strokeWidth="3" style={{ cursor: 'pointer', transition: 'r 0.1s ease' }} />
                            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--primary-dark)" style={{ opacity: 0, transition: 'opacity 0.15s ease' }} className="chart-tooltip">
                              Rp {Math.round(p.val / 1000)}k
                            </text>
                            <text x={p.x} y="190" textAnchor="middle" fontSize="9" fill="var(--text-muted)">
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    );
                  })()}
                </div>
              </div>

              {/* Top Selling Items Card */}
              <div className="admin-card" style={{ padding: '24px' }}>
                <div className="admin-card-header" style={{ marginBottom: '20px' }}>
                  <h2>☕ Menu Terlaris (Qty)</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {reports.topSellingItems.length > 0 ? (
                    reports.topSellingItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            backgroundColor: idx === 0 ? '#FEF3C7' : idx === 1 ? '#E0F2FE' : '#F3F4F6',
                            color: idx === 0 ? '#D97706' : idx === 1 ? '#0284C7' : '#4B5563',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                        </div>
                        <span style={{ backgroundColor: 'rgba(78, 54, 41, 0.08)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                          {item.qty} Porsi
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      Belum ada penjualan menu.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : activeTab === "menu" ? (
          <>
            {/* Stats Cards */}
            <section className="admin-stats-grid">
              <div className="stat-card">
                <div className="stat-icon total-items">☕</div>
                <div className="stat-details">
                  <span>Total Menu</span>
                  <h3>{totalMenuCount} Item</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon total-categories">📂</div>
                <div className="stat-details">
                  <span>Kategori</span>
                  <h3>{totalCategoriesCount} Kategori</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon out-of-stock">🚫</div>
                <div className="stat-details">
                  <span>Stok Habis</span>
                  <h3>{outOfStockCount} Item</h3>
                </div>
              </div>
            </section>

            {/* Table Card */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h2>Semua Menu Makanan & Minuman</h2>
              </div>
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Info Menu</th>
                      <th>Kategori</th>
                      <th>Harga</th>
                      <th>Status Stok</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.length > 0 ? (
                      menuItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="admin-table-item-info">
                              <div className="admin-table-item-img" style={{ overflow: 'hidden' }}>
                                {item.image && !item.image.includes('placeholder') && !item.image.includes('espresso.jpg') ? (
                                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  item.category?.slug === 'pastry' ? '🥐' : '☕'
                                )}
                              </div>
                              <div>
                                <div className="admin-table-item-name">{item.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '300px' }}>
                                  {item.description || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
                              {item.category?.name}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700 }}>
                              Rp {item.price.toLocaleString("id-ID")}
                            </span>
                          </td>
                          <td>
                            <span className={`table-badge ${item.available ? "available" : "unavailable"}`}>
                              {item.available ? "Tersedia" : "Habis"}
                            </span>
                          </td>
                          <td>
                            <div className="actions-cell">
                              <button
                                className="action-icon-btn toggle"
                                onClick={() => handleToggleAvailable(item)}
                                title={item.available ? "Set Habis" : "Set Tersedia"}
                              >
                                {item.available ? "🚫" : "✅"}
                              </button>
                              <button
                                className="action-icon-btn edit"
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                className="action-icon-btn delete"
                                onClick={() => handleDeleteItem(item.id)}
                                title="Hapus"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center" style={{ padding: '40px' }}>
                          Belum ada menu yang dibuat. Klik "+ Tambah Menu Baru" di atas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Orders Stats Cards */}
            <section className="admin-stats-grid">
              <div className="stat-card">
                <div className="stat-icon total-items" style={{ backgroundColor: 'rgba(78, 54, 41, 0.1)' }}>🛒</div>
                <div className="stat-details">
                  <span>Total Pesanan</span>
                  <h3>{orders.length} Order</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon total-categories" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>⏳</div>
                <div className="stat-details">
                  <span>Pesanan Aktif</span>
                  <h3>{orders.filter(o => o.status === 'PENDING' || o.status === 'PAID').length} Order</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon out-of-stock" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>✅</div>
                <div className="stat-details">
                  <span>Selesai</span>
                  <h3>{orders.filter(o => o.status === 'COMPLETED').length} Order</h3>
                </div>
              </div>
            </section>

            {/* Orders Table Card */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h2>Daftar Pesanan Pelanggan</h2>
              </div>
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Order ID</th>
                      <th style={{ width: '120px' }}>Waktu</th>
                      <th style={{ width: '180px' }}>Pelanggan</th>
                      <th>Detail Pesanan</th>
                      <th style={{ width: '130px' }}>Total Bayar</th>
                      <th style={{ width: '120px' }}>Metode</th>
                      <th style={{ width: '120px' }}>Status</th>
                      <th style={{ width: '160px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length > 0 ? (
                      orders.map((order) => {
                        let parsedItems = [];
                        try {
                          parsedItems = JSON.parse(order.items);
                        } catch(e) {
                          console.error("Error parsing items for order:", order.id);
                        }

                        // Colors for status badges
                        let statusColor = '#9CA3AF';
                        let statusLabel = order.status;
                        if (order.status === 'PENDING') {
                          statusColor = '#F59E0B'; // Orange
                          statusLabel = 'Belum Bayar';
                        } else if (order.status === 'PAID') {
                          statusColor = '#10B981'; // Green
                          statusLabel = 'Lunas';
                        } else if (order.status === 'COMPLETED') {
                          statusColor = '#3B82F6'; // Blue
                          statusLabel = 'Selesai';
                        } else if (order.status === 'CANCELLED') {
                          statusColor = '#EF4444'; // Red
                          statusLabel = 'Batal';
                        }

                        // Label for payment methods
                        let payMethodLabel = order.paymentMethod;
                        if (order.paymentMethod === 'CASH') payMethodLabel = '💵 Tunai';
                        if (order.paymentMethod === 'TRANSFER') payMethodLabel = '🏦 Transfer';
                        if (order.paymentMethod === 'QRIS') payMethodLabel = '📱 QRIS';

                        return (
                          <tr key={order.id}>
                            <td>
                              <span style={{ fontWeight: 'bold' }}>#{order.id}</span>
                            </td>
                            <td>
                              <div style={{ fontSize: '13px' }}>
                                {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}>{order.customerName}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.tableNumber}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 0' }}>
                                {parsedItems.map((item, idx) => {
                                  const customs = [];
                                  if (item.size && item.size !== 'Regular') customs.push(item.size);
                                  if (item.sugar && item.sugar !== 'Normal') customs.push(`${item.sugar} Sugar`);
                                  if (item.ice && item.ice !== 'Normal') customs.push(`${item.ice} Ice`);
                                  if (item.addon && item.addon !== 'None') customs.push(item.addon);

                                  return (
                                    <div key={idx} style={{ fontSize: '13px', lineHeight: '1.4' }}>
                                      <span style={{ fontWeight: 'bold', color: '#111' }}>{item.quantity}x</span> {item.name} 
                                      {customs.length > 0 && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px', fontStyle: 'italic' }}>
                                          ({customs.join(', ')})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                                {order.notes && (
                                  <div style={{ fontSize: '11px', color: '#B45309', backgroundColor: '#FEF3C7', padding: '4px 8px', borderRadius: '4px', marginTop: '4px', maxWidth: 'fit-content' }}>
                                    📝 Catatan: {order.notes}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 'bold', color: '#111' }}>
                                Rp {order.totalAmount.toLocaleString("id-ID")}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>{payMethodLabel}</span>
                            </td>
                            <td>
                              <span style={{ 
                                display: 'inline-block', 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '11px', 
                                fontWeight: 'bold', 
                                color: 'white',
                                backgroundColor: statusColor
                              }}>
                                {statusLabel}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {order.status === 'PENDING' && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'PAID')}
                                    className="btn btn-primary"
                                    style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: '#10B981', borderColor: '#10B981' }}
                                    title="Konfirmasi Lunas"
                                  >
                                    💵 Bayar
                                  </button>
                                )}
                                {(order.status === 'PENDING' || order.status === 'PAID') && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'COMPLETED')}
                                      className="btn btn-primary"
                                      style={{ padding: '6px 10px', fontSize: '11px' }}
                                      title="Tandai Selesai"
                                    >
                                      ✓ Selesai
                                    </button>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
                                      className="btn btn-secondary"
                                      style={{ padding: '6px 10px', fontSize: '11px', color: '#EF4444', borderColor: '#EF4444' }}
                                      title="Batalkan Pesanan"
                                    >
                                      ✕ Batal
                                    </button>
                                  </>
                                )}
                                {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                                    Tidak ada aksi
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center" style={{ padding: '40px' }}>
                          Belum ada pesanan masuk saat ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Add/Edit Menu Item Modal */}
      {isModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: '650px' }}>
            <button className="close-modal" onClick={() => setIsModalOpen(false)}>✕</button>
            <div className="modal-content" style={{ padding: '32px' }}>
              <h2 style={{ marginBottom: '24px', color: 'var(--primary-dark)' }}>
                {editingItem ? "Ubah Detail Menu" : "Tambah Menu Baru"}
              </h2>

              {errorMsg && <div className="error-message">{errorMsg}</div>}

              <form onSubmit={handleFormSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Nama Menu</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="cth. Avocado Coffee Latte"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Harga (Rupiah)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="cth. 35000"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select
                      className="form-select"
                      required
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Foto Menu (Unggah Gambar)</label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: 'var(--radius-sm)', 
                        backgroundColor: 'var(--accent)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '20px', 
                        overflow: 'hidden', 
                        border: '1px solid var(--border-color)',
                        flexShrink: 0
                      }}>
                        {formImage && !formImage.includes('placeholder') && !formImage.includes('espresso.jpg') ? (
                          <img src={formImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          '📸'
                        )}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          style={{ fontSize: '13px', width: '100%' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {uploading ? "Mengunggah..." : "Pilih file gambar untuk diunggah langsung ke galeri"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label" style={{ margin: '12px 0 24px' }}>
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={formAvailable}
                      onChange={(e) => setFormAvailable(e.target.checked)}
                    />
                    Menu ini tersedia untuk dipesan (In Stock)
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi Menu</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Tuliskan deskripsi hidangan, bumbu, bahan, dsb..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingItem ? "Simpan Perubahan" : "Buat Menu Baru"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Order Notification Banner */}
      {notificationMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#3F2C24',
          borderLeft: '5px solid var(--secondary)',
          color: 'white',
          padding: '18px 24px',
          borderRadius: '10px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontWeight: '600',
          fontSize: '14px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: '18px' }}>🔔</span>
          <span style={{ flex: 1 }}>{notificationMsg}</span>
          <button 
            onClick={() => setNotificationMsg("")} 
            style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', padding: '2px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast active" style={{ zIndex: 999999 }}>
          <span className="toast-success-icon">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
