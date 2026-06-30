"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
    if (isLoggedIn) {
      router.push("/admin");
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal masuk");
      } else {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("adminUser", data.username);
        router.push("/admin");
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi internet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <Link href="/" className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '36px' }}>🍽️</span> Resto Rasa
        </Link>
        <h2 className="login-title">Admin Portal</h2>
        <p className="login-subtitle">Masuk untuk mengelola menu Anda</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="Masukkan username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Masukkan password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? "Menghubungkan..." : "Masuk Sekarang ➔"}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '13px' }}>
          <Link href="/" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
            ← Kembali ke Menu Pelanggan
          </Link>
        </p>
      </div>
    </div>
  );
}
