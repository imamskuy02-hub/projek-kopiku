"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function MenuClient({ initialCategories, initialMenuItems, dbError }) {
  // States
  const [categories] = useState(initialCategories || []);
  const [menuItems, setMenuItems] = useState(initialMenuItems || []);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart & Modals
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState(null);
  
  // Customization Form States
  const [selectedSize, setSelectedSize] = useState('Regular');
  const [selectedSugar, setSelectedSugar] = useState('Normal');
  const [selectedIce, setSelectedIce] = useState('Normal');
  const [selectedAddon, setSelectedAddon] = useState('None');
  const [quantity, setQuantity] = useState(1);
  
  // Checkout Info
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSimulated, setOrderSimulated] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  // Show Toast
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Filtered menu items based on category and search query
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.categorySlug === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  // Open Customization Modal
  const handleOpenCustomise = (item) => {
    if (!item.available) return;
    setCustomizingItem(item);
    setSelectedSize('Regular');
    setSelectedSugar('Normal');
    setSelectedIce('Normal');
    setSelectedAddon('None');
    setQuantity(1);
  };

  // Calculate customized item price
  const calculateItemPrice = (item, size, addon) => {
    let price = item.price;
    if (size === 'Large') price += 5000;
    if (addon === 'Extra Shot') price += 5000;
    if (addon === 'Caramel Syrup' || addon === 'Hazelnut Syrup') price += 4000;
    return price;
  };

  // Add customized item to cart
  const handleAddToCart = () => {
    if (!customizingItem) return;

    const finalUnitPrice = calculateItemPrice(customizingItem, selectedSize, selectedAddon);
    
    // Create unique key based on item id and customization choices
    const cartItemKey = `${customizingItem.id}-${selectedSize}-${selectedSugar}-${selectedIce}-${selectedAddon}`;

    const existingItemIndex = cart.findIndex(item => item.key === cartItemKey);

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += quantity;
      updatedCart[existingItemIndex].totalPrice = updatedCart[existingItemIndex].quantity * finalUnitPrice;
      setCart(updatedCart);
    } else {
      // Add new item
      const newCartItem = {
        key: cartItemKey,
        id: customizingItem.id,
        name: customizingItem.name,
        image: customizingItem.image,
        unitPrice: finalUnitPrice,
        totalPrice: finalUnitPrice * quantity,
        quantity,
        size: selectedSize,
        sugar: selectedSugar,
        ice: selectedIce,
        addon: selectedAddon,
      };
      setCart([...cart, newCartItem]);
    }

    triggerToast(`Ditambahkan ke keranjang: ${customizingItem.name} (${quantity}x)`);
    setCustomizingItem(null);
  };

  // Adjust item quantity in cart
  const updateCartItemQty = (itemKey, delta) => {
    const updatedCart = cart.map(item => {
      if (item.key === itemKey) {
        const newQty = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQty,
          totalPrice: newQty * item.unitPrice
        };
      }
      return item;
    });
    setCart(updatedCart);
  };

  // Remove item from cart
  const removeCartItem = (itemKey) => {
    setCart(cart.filter(item => item.key !== itemKey));
  };

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  // Submit Order to Database and WhatsApp
  const submitOrder = async (finalStatus = 'PENDING') => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          tableNumber,
          notes: orderNotes,
          paymentMethod,
          totalAmount: cartTotal,
          items: JSON.stringify(cart),
          status: finalStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menyimpan pesanan');
      }

      const createdOrder = await response.json();
      
      let paymentLabel = 'Tunai di Kasir';
      if (paymentMethod === 'TRANSFER') paymentLabel = 'Transfer Bank';
      if (paymentMethod === 'QRIS') paymentLabel = 'QRIS';

      // Format WhatsApp message text
      let orderText = `*HALO KOPIKU! SAYA INGIN MEMESAN:*\n\n`;
      orderText += `*Order ID:* #${createdOrder.id}\n`;
      orderText += `*Status:* ${finalStatus === 'PAID' ? 'Sudah Dibayar (Konfirmasi Lunas)' : 'Belum Dibayar (Bayar di Kasir)'}\n\n`;
      
      cart.forEach((item, index) => {
        const customs = [];
        if (item.size !== 'Regular') customs.push(`Ukuran: ${item.size}`);
        if (item.sugar !== 'Normal') customs.push(`Gula: ${item.sugar}`);
        if (item.ice !== 'Normal') customs.push(`Es: ${item.ice}`);
        if (item.addon !== 'None') customs.push(`Tambahan: ${item.addon}`);
        
        const customString = customs.length > 0 ? ` (${customs.join(', ')})` : '';
        orderText += `${index + 1}. *${item.name}* x${item.quantity}${customString}\n`;
        orderText += `   Subtotal: Rp ${item.totalPrice.toLocaleString('id-ID')}\n\n`;
      });

      orderText += `*TOTAL PEMBAYARAN: Rp ${cartTotal.toLocaleString('id-ID')}*\n`;
      orderText += `*Metode Pembayaran:* ${paymentLabel}\n\n`;
      orderText += `*Detail Pemesan:*\n`;
      orderText += `- Nama: ${customerName}\n`;
      orderText += `- Meja/Tipe: ${tableNumber}\n`;
      if (orderNotes) orderText += `- Catatan: ${orderNotes}\n`;

      const encodedText = encodeURIComponent(orderText);
      const whatsappUrl = `https://wa.me/628123456789?text=${encodedText}`;

      // Set simulated order details for receipt pop-up
      setOrderSimulated({
        id: createdOrder.id,
        items: [...cart],
        total: cartTotal,
        name: customerName,
        table: tableNumber,
        notes: orderNotes,
        paymentMethod: paymentLabel,
        status: finalStatus,
        whatsappUrl
      });

      // Clear cart and states
      setCart([]);
      setIsCartOpen(false);
      setPaymentMethod('');
      setCustomerName('');
      setTableNumber('');
      setOrderNotes('');
      setIsPaying(false);
      triggerToast('Pesanan berhasil dibuat!');
    } catch (err) {
      console.error(err);
      triggerToast(`Error: ${err.message}`);
    }
  };

  // Handle Checkout / Order Generation
  const handleCheckout = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName) {
      triggerToast('Silakan masukkan nama Anda!');
      return;
    }
    if (!tableNumber) {
      triggerToast('Silakan masukkan nomor meja atau pilih Takeaway!');
      return;
    }
    if (!paymentMethod) {
      triggerToast('Silakan pilih metode pembayaran!');
      return;
    }

    if (paymentMethod === 'CASH') {
      submitOrder('PENDING');
    } else {
      setIsPaying(true);
    }
  };

  return (
    <>
      {/* Premium Navbar */}
      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo">
            <span className="logo-icon">☕</span> Kopiku
          </Link>
          <ul className="nav-links">
            <li><a href="#" className="nav-link active">Menu</a></li>
            <li><a href="#tentang" className="nav-link">Tentang Kami</a></li>
            <li><Link href="/admin" className="nav-link">Admin Portal</Link></li>
          </ul>
          <div className="header-actions">
            <button className="cart-trigger" onClick={() => setIsCartOpen(true)}>
              <span>🛒</span> Keranjang
              {cart.length > 0 && <span className="cart-badge">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="hero-badge">✨ Biji Kopi Arabika Pilihan</div>
            <h1 className="hero-title">
              Awali Harimu Dengan <span>Kopi Istimewa</span>
            </h1>
            <p className="hero-desc">
              Nikmati racikan kopi premium yang diseduh secara presisi oleh barista terbaik kami. Pesan langsung dari meja Anda dengan mudah dan cepat.
            </p>
            <div className="hero-actions">
              <a href="#menu-pilihan" className="btn btn-primary">Lihat Menu Pilihan</a>
              <a href="#tentang" className="btn btn-secondary">Cerita Kami</a>
            </div>
          </div>
          <div className="hero-image-wrapper">
            <div className="hero-image-circle">
              <span className="hero-image-placeholder">☕</span>
            </div>
            <div className="floating-card floating-card-1">
              <div className="floating-icon">⭐</div>
              <div className="floating-text">
                <h4>Signature Latte</h4>
                <p>Favorit Pelanggan</p>
              </div>
            </div>
            <div className="floating-card floating-card-2">
              <div className="floating-icon">🥐</div>
              <div className="floating-text">
                <h4>Butter Croissant</h4>
                <p>Panggang Setiap Pagi</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Menu Grid */}
      <section id="menu-pilihan" className="menu-section">
        <div className="container">
          <div className="menu-header text-center">
            <span className="section-subtitle">Daftar Menu</span>
            <h2 className="section-title">Nikmati Sajian Kopiku</h2>
            <p style={{ maxWidth: '600px', margin: '0 auto' }}>
              Pilih dari berbagai kategori minuman espresso, susu, non-kopi, hingga kue pendamping yang dibuat segar setiap hari.
            </p>
          </div>

          {dbError && (
            <div className="db-error-alert" style={{
              background: 'rgba(211, 47, 47, 0.05)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              margin: '32px auto 0 auto',
              maxWidth: '800px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
              backdropFilter: 'blur(8px)',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>⚠️</span>
              <h3 style={{ color: 'var(--danger)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                Koneksi Database Gagal / Terputus
              </h3>
              <p style={{ color: 'var(--text-main)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                Aplikasi Kopiku tidak dapat memuat daftar menu saat ini karena masalah koneksi ke database MySQL.
              </p>
              <div style={{
                background: 'rgba(45, 31, 24, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
                wordBreak: 'break-all',
                textAlign: 'left',
                maxHeight: '120px',
                overflowY: 'auto',
                marginBottom: '16px'
              }}>
                <strong>Log Kesalahan:</strong> {dbError}
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                lineHeight: '1.5',
                paddingTop: '12px',
                borderTop: '1px dashed var(--border-color)'
              }}>
                💡 <strong>Solusi:</strong> Pastikan Anda telah mengaktifkan <strong>Remote MySQL</strong> dengan akses host <code>%</code> di cPanel hosting Anda, dan parameter <code>DATABASE_URL</code> di Vercel / berkas <code>.env</code> sudah benar.
              </div>
            </div>
          )}

          {/* Search & Category Filter Bar */}
          <div className="search-filter-bar">
            {/* Search Box */}
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Cari kopi atau makanan..." 
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Pills */}
            <ul className="category-pills">
              <li>
                <button 
                  className={`category-btn ${activeCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('all')}
                >
                  Semua
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button 
                    className={`category-btn ${activeCategory === cat.slug ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.slug)}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Menu Items Display */}
          {filteredMenuItems.length > 0 ? (
            <div className="menu-grid">
              {filteredMenuItems.map((item) => (
                <div key={item.id} className="menu-card">
                  <div className="menu-image-container">
                    {item.image && !item.image.includes('placeholder') && !item.image.includes('espresso.jpg') ? (
                      <img src={item.image} alt={item.name} className="menu-image" />
                    ) : (
                      <span className="menu-image-placeholder">
                        {item.categorySlug === 'espresso-base' || item.categorySlug === 'milk-base' ? '☕' : 
                         item.categorySlug === 'non-coffee' ? '🍵' : '🥐'}
                      </span>
                    )}
                    <span className="menu-badge">{item.categoryName}</span>
                    {!item.available && <span className="out-of-stock-badge">Habis</span>}
                  </div>
                  <div className="menu-content">
                    <h3 className="menu-title">{item.name}</h3>
                    <p className="menu-desc">{item.description || 'Tidak ada deskripsi tersedia.'}</p>
                    <div className="menu-footer">
                      <span className="menu-price">Rp {item.price.toLocaleString('id-ID')}</span>
                      <button 
                        className="add-btn" 
                        onClick={() => handleOpenCustomise(item)}
                        disabled={!item.available}
                        title={item.available ? "Pesan dan kustomisasi" : "Sedang habis"}
                      >
                        ➕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center" style={{ padding: '60px 0' }}>
              <span style={{ fontSize: '48px' }}>🔍</span>
              <h3 style={{ marginTop: '16px', color: 'var(--primary-dark)' }}>Menu tidak ditemukan</h3>
              <p>Coba gunakan kata kunci pencarian atau kategori lain.</p>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="tentang" className="menu-section" style={{ backgroundColor: 'rgba(78, 54, 41, 0.02)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <span className="section-subtitle">Cerita Kami</span>
            <h2 className="section-title" style={{ fontFamily: 'var(--font-display)' }}>Menghadirkan Kopi Terbaik Sejak 2026</h2>
            <p>
              Kopiku berawal dari mimpi sederhana: menyajikan secangkir kopi segar dengan cita rasa asli nusantara dalam atmosfer modern. Kami bekerja sama secara langsung dengan petani kopi lokal di Mandailing, Kintamani, dan Toraja untuk memastikan kualitas biji kopi terbaik yang diproses secara etis.
            </p>
            <p>
              Dengan memadukan teknik pemanggangan modern dan seduhan presisi dari barista kami, setiap gelas Kopiku dirancang untuk menghadirkan rasa otentik yang membuat Anda ingin kembali lagi.
            </p>
            <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
              <div>
                <h3 style={{ fontSize: '32px', color: 'var(--secondary)' }}>100%</h3>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Arabika Lokal</p>
              </div>
              <div>
                <h3 style={{ fontSize: '32px', color: 'var(--secondary)' }}>Fresh</h3>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Roasted Weekly</p>
              </div>
              <div>
                <h3 style={{ fontSize: '32px', color: 'var(--secondary)' }}>Sourced</h3>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Ethically</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-about">
              <h3>Kopiku</h3>
              <p>Sajian kopi premium hangat yang menghubungkan rasa, cerita, dan kebersamaan di setiap cangkirnya.</p>
              <div className="social-links">
                <a href="#" className="social-link">🌐</a>
                <a href="#" className="social-link">📸</a>
                <a href="#" className="social-link">💬</a>
              </div>
            </div>
            <div className="footer-links">
              <h4>Navigasi</h4>
              <ul>
                <li><a href="#">Beranda</a></li>
                <li><a href="#menu-pilihan">Menu Kopi</a></li>
                <li><a href="#tentang">Tentang Kami</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Kontak</h4>
              <ul>
                <li style={{ color: 'var(--accent)', opacity: 0.8 }}>📍 Jl. Kopi Raya No. 42, Jakarta</li>
                <li style={{ color: 'var(--accent)', opacity: 0.8 }}>📞 +62 812-3456-789</li>
                <li style={{ color: 'var(--accent)', opacity: 0.8 }}>✉️ info@kopikita.com</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 Kopiku Startup. All rights reserved.</p>
            <p>Dibuat dengan rasa cinta terhadap kopi ☕</p>
          </div>
        </div>
      </footer>

      {/* Item Customization Modal */}
      {customizingItem && (
        <div className="modal-overlay active">
          <div className="modal-container">
            <button className="close-modal" onClick={() => setCustomizingItem(null)}>✕</button>
            <div className="modal-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--accent)', overflow: 'hidden' }}>
              {customizingItem.image && !customizingItem.image.includes('placeholder') && !customizingItem.image.includes('espresso.jpg') ? (
                <img src={customizingItem.image} alt={customizingItem.name} className="menu-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="modal-hero-placeholder" style={{ transform: 'none' }}>
                  {customizingItem.categorySlug === 'espresso-base' || customizingItem.categorySlug === 'milk-base' ? '☕' : 
                   customizingItem.categorySlug === 'non-coffee' ? '🍵' : '🥐'}
                </span>
              )}
            </div>
            <div className="modal-content">
              <div className="modal-title-desc">
                <h3 className="modal-title">{customizingItem.name}</h3>
                <p className="modal-desc">{customizingItem.description}</p>
              </div>

              {/* Show drink options only for beverages (not pastries) */}
              {customizingItem.categorySlug !== 'pastry' && (
                <>
                  {/* Size Customization */}
                  <div className="customization-section">
                    <div className="customization-title">
                      Ukuran Gelas <span>Wajib</span>
                    </div>
                    <div className="option-grid">
                      <label>
                        <input 
                          type="radio" 
                          name="size" 
                          className="option-radio"
                          checked={selectedSize === 'Regular'}
                          onChange={() => setSelectedSize('Regular')}
                        />
                        <div className="option-card">Regular <span>+Rp 0</span></div>
                      </label>
                      <label>
                        <input 
                          type="radio" 
                          name="size" 
                          className="option-radio"
                          checked={selectedSize === 'Large'}
                          onChange={() => setSelectedSize('Large')}
                        />
                        <div className="option-card">Large <span>+Rp 5.000</span></div>
                      </label>
                    </div>
                  </div>

                  {/* Sugar Customization */}
                  <div className="customization-section">
                    <div className="customization-title">
                      Tingkat Kemanisan <span>Opsional</span>
                    </div>
                    <div className="option-grid">
                      <label>
                        <input 
                          type="radio" 
                          name="sugar" 
                          className="option-radio"
                          checked={selectedSugar === 'Normal'}
                          onChange={() => setSelectedSugar('Normal')}
                        />
                        <div className="option-card">Normal</div>
                      </label>
                      <label>
                        <input 
                          type="radio" 
                          name="sugar" 
                          className="option-radio"
                          checked={selectedSugar === 'Less'}
                          onChange={() => setSelectedSugar('Less')}
                        />
                        <div className="option-card">Less Sugar</div>
                      </label>
                      <label>
                        <input 
                          type="radio" 
                          name="sugar" 
                          className="option-radio"
                          checked={selectedSugar === 'No Sugar'}
                          onChange={() => setSelectedSugar('No Sugar')}
                        />
                        <div className="option-card">No Sugar</div>
                      </label>
                    </div>
                  </div>

                  {/* Ice Customization */}
                  <div className="customization-section">
                    <div className="customization-title">
                      Es <span>Opsional</span>
                    </div>
                    <div className="option-grid">
                      <label>
                        <input 
                          type="radio" 
                          name="ice" 
                          className="option-radio"
                          checked={selectedIce === 'Normal'}
                          onChange={() => setSelectedIce('Normal')}
                        />
                        <div className="option-card">Normal Ice</div>
                      </label>
                      <label>
                        <input 
                          type="radio" 
                          name="ice" 
                          className="option-radio"
                          checked={selectedIce === 'Less'}
                          onChange={() => setSelectedIce('Less')}
                        />
                        <div className="option-card">Less Ice</div>
                      </label>
                      <label>
                        <input 
                          type="radio" 
                          name="ice" 
                          className="option-radio"
                          checked={selectedIce === 'No Ice'}
                          onChange={() => setSelectedIce('No Ice')}
                        />
                        <div className="option-card">No Ice</div>
                      </label>
                    </div>
                  </div>


                </>
              )}

              {/* Quantity */}
              <div className="customization-section">
                <div className="customization-title">Jumlah</div>
                <div className="quantity-control">
                  <button className="qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                  <span className="qty-num">{quantity}</span>
                  <button className="qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
              </div>

              {/* Price and Add button */}
              <div className="modal-footer">
                <div>
                  <div className="total-price-label">Total Harga</div>
                  <div className="total-price">
                    Rp {(calculateItemPrice(customizingItem, selectedSize, selectedAddon) * quantity).toLocaleString('id-ID')}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleAddToCart}>
                  Tambahkan Ke Keranjang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <div className={`modal-overlay ${isCartOpen ? 'active' : ''}`} onClick={() => setIsCartOpen(false)}></div>
      <div className={`cart-drawer ${isCartOpen ? 'active' : ''}`}>
        <div className="cart-header">
          <h3 className="cart-title">🛒 Keranjang Belanja</h3>
          <button className="close-cart" onClick={() => setIsCartOpen(false)}>✕</button>
        </div>

        <div className="cart-items">
          {cart.length > 0 ? (
            cart.map((item) => (
              <div key={item.key} className="cart-item">
                <div className="cart-item-image">
                  {item.image.includes('croissant') || item.image.includes('cake') ? '🥐' : '☕'}
                </div>
                <div className="cart-item-details">
                  <h4 className="cart-item-name">{item.name}</h4>
                  <div className="cart-item-customizations">
                    {item.size !== 'Regular' && <span>{item.size}</span>}
                    {item.sugar !== 'Normal' && <span>{item.sugar} Sugar</span>}
                    {item.ice !== 'Normal' && <span>{item.ice} Ice</span>}
                    {item.addon !== 'None' && <span>{item.addon}</span>}
                  </div>
                  <div className="cart-item-qty-price">
                    <div className="quantity-control" style={{ gap: '10px' }}>
                      <button className="qty-btn" style={{ width: '28px', height: '28px', fontSize: '14px' }} onClick={() => updateCartItemQty(item.key, -1)}>-</button>
                      <span className="qty-num" style={{ fontSize: '14px', width: '16px' }}>{item.quantity}</span>
                      <button className="qty-btn" style={{ width: '28px', height: '28px', fontSize: '14px' }} onClick={() => updateCartItemQty(item.key, 1)}>+</button>
                    </div>
                    <span className="cart-item-price">Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <button className="remove-cart-item" onClick={() => removeCartItem(item.key)}>✕</button>
              </div>
            ))
          ) : (
            <div className="cart-empty">
              <span className="cart-empty-icon">🛒</span>
              <h4>Keranjang Anda Kosong</h4>
              <p>Silakan pilih minuman atau makanan lezat di menu untuk ditambahkan.</p>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <form className="cart-footer" onSubmit={handleCheckout}>
            <div className="cart-input-group">
              <label className="cart-input-label">Nama Lengkap</label>
              <input 
                type="text" 
                className="cart-input" 
                placeholder="cth. Budi Santoso"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="cart-input-group">
              <label className="cart-input-label">Nomor Meja / Jenis Pesanan</label>
              <select 
                className="cart-input" 
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              >
                <option value="">-- Pilih Opsi --</option>
                <option value="Meja 1">Meja 1</option>
                <option value="Meja 2">Meja 2</option>
                <option value="Meja 3">Meja 3</option>
                <option value="Meja 4">Meja 4</option>
                <option value="Meja 5">Meja 5</option>
                <option value="Takeaway / Bungkus">Takeaway / Bungkus</option>
              </select>
            </div>
            <div className="cart-input-group">
              <label className="cart-input-label">Metode Pembayaran</label>
              <select 
                className="cart-input" 
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">-- Pilih Pembayaran --</option>
                <option value="CASH">💵 Tunai di Kasir</option>
                <option value="TRANSFER">🏦 Transfer Bank</option>
                <option value="QRIS">📱 QRIS (Dana/OVO/GoPay)</option>
              </select>
            </div>
            <div className="cart-input-group">
              <label className="cart-input-label">Catatan Tambahan (Opsional)</label>
              <input 
                type="text" 
                className="cart-input" 
                placeholder="cth. Minta sedotan bambu, cake dihangatkan"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </div>

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="cart-summary-row">
              <span>Pajak (0%)</span>
              <span>Rp 0</span>
            </div>
            <div className="cart-summary-row total">
              <span>Total Akhir</span>
              <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
            </div>

            <button type="submit" className="btn btn-primary btn-full">
              Pesan Sekarang ➔
            </button>
          </form>
        )}
      </div>

      {/* Payment Instruction Modal */}
      {isPaying && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: '450px' }}>
            <button className="close-modal" onClick={() => setIsPaying(false)}>✕</button>
            <div className="modal-content" style={{ padding: '32px' }}>
              <h3 style={{ color: 'var(--primary-dark)', marginBottom: '16px', textAlign: 'center' }}>
                {paymentMethod === 'QRIS' ? '📱 Pembayaran QRIS' : '🏦 Transfer Bank'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
                <p style={{ fontSize: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Silakan selesaikan pembayaran sebesar:
                </p>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                  Rp {cartTotal.toLocaleString('id-ID')}
                </div>

                {paymentMethod === 'QRIS' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', backgroundColor: '#fff', width: '100%' }}>
                    {/* Stylized CSS QR Code Mockup */}
                    <div style={{ width: '180px', height: '180px', background: '#f5f5f5', display: 'flex', flexWrap: 'wrap', padding: '10px', boxSizing: 'border-box', border: '4px solid #111', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', padding: '4px 8px', fontSize: '10px', fontWeight: '900', border: '2px solid #111', borderRadius: '4px' }}>
                        QRIS
                      </div>
                      <div style={{ width: '45px', height: '45px', border: '8px solid #111', boxSizing: 'border-box', position: 'absolute', top: '10px', left: '10px' }} />
                      <div style={{ width: '45px', height: '45px', border: '8px solid #111', boxSizing: 'border-box', position: 'absolute', top: '10px', right: '10px' }} />
                      <div style={{ width: '45px', height: '45px', border: '8px solid #111', boxSizing: 'border-box', position: 'absolute', bottom: '10px', left: '10px' }} />
                      <div style={{ width: '100%', height: '100%', border: '2px dashed #999', pointerEvents: 'none' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#111' }}>KOPIKU - KASIR</span>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: '0' }}>
                      Scan QR di atas menggunakan aplikasi dompet digital Anda (Gopay, OVO, Dana, LinkAja, BCA Mobile, dll).
                    </p>
                  </div>
                ) : (
                  <div style={{ width: '100%', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(78, 54, 41, 0.02)' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bank Tujuan</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary-dark)' }}>BANK CENTRAL ASIA (BCA)</div>
                    </div>
                    <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nomor Rekening</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: '#111' }}>8012 3456 789</div>
                      </div>
                      <button 
                        type="button"
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => {
                          navigator.clipboard.writeText("80123456789");
                          triggerToast("Nomor rekening disalin!");
                        }}
                      >
                        📋 Salin
                      </button>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nama Penerima</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>KOPIKU PT</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <button 
                  type="button" 
                  className="btn btn-primary btn-full"
                  onClick={() => submitOrder('PAID')}
                >
                  Saya Sudah Bayar ➔
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-full"
                  onClick={() => setIsPaying(false)}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Order Result / Receipt Modal */}
      {orderSimulated && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <button className="close-modal" onClick={() => setOrderSimulated(null)}>✕</button>
            <div className="modal-content" style={{ padding: '40px' }}>
              <div className="text-center" style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '64px' }}>🎉</span>
                <h2 style={{ color: 'var(--primary-dark)', marginTop: '16px' }}>Pesanan Berhasil Dibuat!</h2>
                <p style={{ fontSize: '14px' }}>Pesanan Anda sudah tersimpan di sistem kami dan sedang diproses.</p>
              </div>

              <div style={{ backgroundColor: 'var(--background)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary-light)', marginBottom: '24px', fontFamily: 'monospace', fontSize: '13px' }}>
                <h4 style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>STRUK PEMESANAN</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '8px' }}>
                    <span>Order ID: #{orderSimulated.id}</span>
                    <span style={{ color: orderSimulated.status === 'PAID' ? '#10B981' : '#F59E0B' }}>
                      {orderSimulated.status === 'PAID' ? 'LUNAS (PAID)' : 'BELUM DIBAYAR'}
                    </span>
                  </div>
                  {orderSimulated.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.quantity}x {item.name}</span>
                      <span>Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>TOTAL</span>
                    <span>Rp {orderSimulated.total.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <div>Nama: {orderSimulated.name}</div>
                    <div>Meja: {orderSimulated.table}</div>
                    <div>Metode Bayar: {orderSimulated.paymentMethod}</div>
                    {orderSimulated.notes && <div>Catatan: {orderSimulated.notes}</div>}
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-primary btn-full" 
                onClick={() => setOrderSimulated(null)}
              >
                Kembali Belanja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      <div className={`toast ${toastMessage ? 'active' : ''}`}>
        <span className="toast-success-icon">✓</span>
        <span>{toastMessage}</span>
      </div>
    </>
  );
}
