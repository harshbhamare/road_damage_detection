'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Layers,
  UploadCloud,
  FileText,
  MapPin,
  Activity,
  Plus,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('road_theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('road_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Layers },
    { href: '/upload', label: 'Inspect & Scan', icon: UploadCloud },
    { href: '/records', label: 'Distress Records', icon: FileText },
    { href: '/map', label: 'GIS Spatial Map', icon: MapPin },
    { href: '/model-info', label: 'Vision Engine', icon: Activity }
  ];

  return (
    <header className="md-appbar">
      {/* Brand */}
      <Link href="/" className="md-brand">
        <div className="md-brand-icon">
          <Layers size={20} />
        </div>
        <div>
          <span>RoadVision</span>
          <span style={{ color: 'var(--primary)', marginLeft: '4px', fontWeight: 800 }}>AI</span>
        </div>
      </Link>

      {/* Nav Tabs */}
      <nav>
        <ul className="md-nav-tabs">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`md-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="md-btn-icon"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Material theme`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Engine status indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--success-container)',
            color: 'var(--success-text)'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              display: 'inline-block'
            }}
          />
          <span>YOLOv8 Online</span>
        </div>

        {/* Quick New Scan Button */}
        <Link href="/upload" className="md-btn-filled" style={{ padding: '0.5rem 1rem', fontSize: '0.84rem' }}>
          <Plus size={16} />
          <span>New Inspection</span>
        </Link>
      </div>
    </header>
  );
}
