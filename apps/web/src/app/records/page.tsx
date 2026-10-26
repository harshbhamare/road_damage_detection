'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Printer,
  Sparkles,
  Search,
  Check,
  X,
  FileSpreadsheet,
  Globe,
  SlidersHorizontal
} from 'lucide-react';
import { VerificationBadge, ProvenanceBadge, DefectBadge } from '@/components/StatusBadge';
import { calculatePci } from '@/lib/pciEngine';
import WorkOrderModal from '@/components/WorkOrderModal';

export default function RecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [inspectRecord, setInspectRecord] = useState<any | null>(null);
  const [showAuditReport, setShowAuditReport] = useState<boolean>(false);
  const [showWorkOrder, setShowWorkOrder] = useState<boolean>(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/records?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Single record deletion
  const handleDeleteSingle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this distress record?')) return;

    try {
      const res = await fetch('/api/records', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      });
      if (res.ok) {
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        if (inspectRecord?._id === id) setInspectRecord(null);
        await fetchRecords();
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Batch deletion of selected records
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Permanently delete ${selectedIds.length} selected record(s)?`)) return;

    try {
      const res = await fetch('/api/records', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setSelectedIds([]);
        await fetchRecords();
      }
    } catch (err: any) {
      alert(`Batch delete failed: ${err.message}`);
    }
  };

  // Update status (Verify / Reject)
  const handleUpdateStatus = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        setRecords((prev) =>
          prev.map((r) => (r._id === id ? { ...r, status } : r))
        );
        if (inspectRecord && inspectRecord._id === id) {
          setInspectRecord({ ...inspectRecord, status });
        }
      }
    } catch (err) {
      console.warn('Status update notice:', err);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      'Record ID',
      'Defect Code',
      'Category',
      'Confidence',
      'Max Depth (mm)',
      'Crack Aperture (mm)',
      'ASTM Severity',
      'Patch/Sealant Mass (kg)',
      'Remaining Life (Mo)',
      'Road Corridor',
      'Latitude',
      'Longitude',
      'Status',
      'Inference Engine',
      'Timestamp'
    ];
    const rows = records.map((r) => [
      r._id,
      r.damageType,
      r.damageCategory,
      (r.confidence * 100).toFixed(1) + '%',
      r.metrics?.depth_max_mm || '',
      r.metrics?.crack_width_mm || '',
      r.metrics?.depth_severity || '',
      r.metrics?.asphalt_patch_mass_kg > 0 ? r.metrics.asphalt_patch_mass_kg : (r.metrics?.crack_sealant_mass_kg || ''),
      r.metrics?.remaining_service_life_months || '',
      `"${(r.roadName || '').replace(/"/g, '""')}"`,
      r.latitude || '',
      r.longitude || '',
      r.status,
      r.isDemo ? 'Demo Mode' : 'YOLOv8',
      r.createdAt || ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `road-distress-registry-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to GeoJSON
  const handleExportGeoJSON = () => {
    const features = records
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [r.longitude, r.latitude]
        },
        properties: {
          id: r._id,
          damageType: r.damageType,
          damageCategory: r.damageCategory,
          confidence: r.confidence,
          roadName: r.roadName,
          status: r.status,
          imageUrl: r.mediaId?.publicUrl || r.media?.publicUrl,
          createdAt: r.createdAt
        }
      }));

    const geoJson = {
      type: 'FeatureCollection',
      name: 'Road_Distress_Survey_Layer',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geoJson, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `road-distress-spatial-${Date.now()}.geojson`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllPageSelected =
    records.length > 0 && records.every((r) => selectedIds.includes(r._id));

  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r._id));
    }
  };

  // Filter records by search query
  const filteredRecords = searchQuery.trim()
    ? records.filter((r) =>
        (r.roadName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.damageCategory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.damageType || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : records;

  // PCI calculation for currently visible records
  const currentPci = calculatePci(
    filteredRecords.map((r) => ({
      class_code: r.damageType,
      confidence: r.confidence
    }))
  );

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '0.5rem'
            }}
          >
            <Sparkles size={14} />
            <span>Pavement Condition Audit Registry</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Infrastructure Distress Records
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Audited database of localized potholes and surface cracking across monitored corridors.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowWorkOrder(true)}
            className="md-btn-filled"
            style={{ gap: '6px' }}
          >
            <FileText size={15} />
            <span>Work-Order Ticket</span>
          </button>
          <button
            onClick={() => setShowAuditReport(true)}
            className="md-btn-outlined"
          >
            <Printer size={15} />
            <span>Audit Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="md-btn-outlined"
            title="Download CSV spreadsheet"
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportGeoJSON}
            className="md-btn-outlined"
            title="Download GeoJSON for GIS applications"
          >
            <Globe size={15} />
            <span>GeoJSON</span>
          </button>
          <Link href="/upload" className="md-btn-filled">
            <UploadCloud size={16} />
            <span>New Scan</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="md-card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 300px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search by road corridor or defect name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md-input"
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>

          {/* Distress Type Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setTypeFilter(''); setPage(1); }}
              className={`md-chip ${typeFilter === '' ? 'active' : ''}`}
            >
              All Types
            </button>
            <button
              onClick={() => { setTypeFilter('D40'); setPage(1); }}
              className={`md-chip ${typeFilter === 'D40' ? 'active' : ''}`}
            >
              D40 Pothole
            </button>
            <button
              onClick={() => { setTypeFilter('D20'); setPage(1); }}
              className={`md-chip ${typeFilter === 'D20' ? 'active' : ''}`}
            >
              D20 Alligator
            </button>
            <button
              onClick={() => { setTypeFilter('D10'); setPage(1); }}
              className={`md-chip ${typeFilter === 'D10' ? 'active' : ''}`}
            >
              D10 Transverse
            </button>
            <button
              onClick={() => { setTypeFilter('D00'); setPage(1); }}
              className={`md-chip ${typeFilter === 'D00' ? 'active' : ''}`}
            >
              D00 Longitudinal
            </button>
          </div>

          {/* Status Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => { setStatusFilter(''); setPage(1); }}
              className={`md-chip ${statusFilter === '' ? 'active' : ''}`}
            >
              All Status
            </button>
            <button
              onClick={() => { setStatusFilter('VERIFIED'); setPage(1); }}
              className={`md-chip ${statusFilter === 'VERIFIED' ? 'active' : ''}`}
            >
              Verified
            </button>
            <button
              onClick={() => { setStatusFilter('UNVERIFIED'); setPage(1); }}
              className={`md-chip ${statusFilter === 'UNVERIFIED' ? 'active' : ''}`}
            >
              Pending
            </button>
          </div>
        </div>

        {/* Batch Selection Banner */}
        {selectedIds.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem'
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {selectedIds.length} item(s) selected
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setSelectedIds([])}
                className="md-btn-outlined"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.78rem' }}
              >
                Deselect All
              </button>
              <button
                onClick={handleDeleteSelected}
                className="md-btn-filled"
                style={{
                  backgroundColor: 'var(--error)',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.78rem'
                }}
              >
                <Trash2 size={13} />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="md-card" style={{ padding: '0.5rem 0' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            <div>Loading Pavement Records...</div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No distress records match the specified filters.
          </div>
        ) : (
          <div className="md-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="md-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </th>
                  <th>Image</th>
                  <th>Defect Code</th>
                  <th>Road Corridor</th>
                  <th>Confidence</th>
                  <th>Location (GPS)</th>
                  <th>Audit Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => {
                  const isChecked = selectedIds.includes(r._id);
                  const imgUrl = r.mediaId?.publicUrl || r.media?.publicUrl || '/samples/sample-pothole-1.jpg';

                  return (
                    <tr
                      key={r._id}
                      onClick={() => setInspectRecord(r)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isChecked ? 'var(--primary-container)' : undefined
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(r._id)}
                          style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                      </td>
                      <td>
                        <img
                          src={imgUrl}
                          alt="Distress preview"
                          style={{
                            width: '54px',
                            height: '38px',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--outline)'
                          }}
                        />
                      </td>
                      <td>
                        <DefectBadge code={r.damageType} name={r.damageCategory} />
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.roadName || 'Unnamed Corridor'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {(r.confidence * 100).toFixed(1)}%
                      </td>
                      <td style={{ fontSize: '0.82rem', color: r.hasLocation ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {r.hasLocation && r.latitude && r.longitude
                          ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`
                          : 'No GPS'}
                      </td>
                      <td>
                        <VerificationBadge status={r.status} />
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(r._id, 'VERIFIED')}
                            className="md-btn-icon"
                            style={{
                              width: '28px',
                              height: '28px',
                              color: r.status === 'VERIFIED' ? 'var(--success)' : 'var(--text-muted)'
                            }}
                            title="Verify Record"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(r._id, 'REJECTED')}
                            className="md-btn-icon"
                            style={{
                              width: '28px',
                              height: '28px',
                              color: r.status === 'REJECTED' ? 'var(--error)' : 'var(--text-muted)'
                            }}
                            title="Reject Record"
                          >
                            <X size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSingle(r._id, e)}
                            className="md-btn-icon"
                            style={{ width: '28px', height: '28px' }}
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--outline)',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.84rem'
          }}
        >
          <div style={{ color: 'var(--text-secondary)' }}>
            Showing {filteredRecords.length} of {totalCount} distress items
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="md-btn-outlined"
              style={{ padding: '0.35rem 0.75rem' }}
            >
              <ChevronLeft size={15} /> Prev
            </button>
            <span style={{ fontWeight: 600, padding: '0 0.5rem' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="md-btn-outlined"
              style={{ padding: '0.35rem 0.75rem' }}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Record Inspection Dialog Drawer */}
      {inspectRecord && (
        <div className="md-dialog-overlay" onClick={() => setInspectRecord(null)}>
          <div className="md-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                  <DefectBadge code={inspectRecord.damageType} name={inspectRecord.damageCategory} />
                  <VerificationBadge status={inspectRecord.status} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {inspectRecord.roadName || 'Unnamed Road Corridor'}
                </h3>
              </div>
              <button onClick={() => setInspectRecord(null)} className="md-btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* High-res Image preview */}
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-surface-variant)',
                border: '1px solid var(--outline)',
                marginBottom: '1.25rem',
                maxHeight: '320px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={inspectRecord.mediaId?.publicUrl || inspectRecord.media?.publicUrl || '/samples/sample-pothole-1.jpg'}
                alt="Distress inspection"
                style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain' }}
              />
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>CONFIDENCE</span>
                <strong>{(inspectRecord.confidence * 100).toFixed(1)}%</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>GPS COORDINATES</span>
                <strong>
                  {inspectRecord.latitude && inspectRecord.longitude
                    ? `${inspectRecord.latitude.toFixed(6)}, ${inspectRecord.longitude.toFixed(6)}`
                    : 'Coordinates unavailable'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>MAX DEPTH & SEVERITY</span>
                <strong style={{ color: 'var(--primary)' }}>
                  {inspectRecord.metrics?.depth_max_mm ? `${inspectRecord.metrics.depth_max_mm} mm (${inspectRecord.metrics.depth_severity} Severity)` : 'Pending calculation'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>CRACK APERTURE / WIDTH</span>
                <strong>
                  {inspectRecord.metrics?.crack_width_mm ? `${inspectRecord.metrics.crack_width_mm} mm` : (inspectRecord.metrics?.metric_width_cm ? `${inspectRecord.metrics.metric_width_cm} cm` : 'N/A')}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>MATERIAL TAKEOFF</span>
                <strong>
                  {inspectRecord.metrics?.asphalt_patch_mass_kg > 0
                    ? `${inspectRecord.metrics.asphalt_patch_mass_kg} kg Asphalt (${inspectRecord.metrics.cavity_volume_liters}L)`
                    : `${inspectRecord.metrics?.crack_sealant_mass_kg || 0.85} kg ASTM D6690 Sealant`}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>REMAINING SERVICE LIFE</span>
                <strong style={{ color: '#d97706' }}>
                  {inspectRecord.metrics?.remaining_service_life_months ? `${inspectRecord.metrics.remaining_service_life_months} Months` : '8 Months'}
                </strong>
              </div>
            </div>

            {inspectRecord.metrics?.treatment_recommendation && (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface-variant)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.82rem', border: '1px solid var(--outline)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>RECOMMENDED INTERVENTION</span>
                <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>{inspectRecord.metrics.treatment_recommendation}</div>
              </div>
            )}

            {/* Verification and Delete Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--outline)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleUpdateStatus(inspectRecord._id, 'VERIFIED')}
                  className="md-btn-filled"
                  style={{ backgroundColor: 'var(--success)', fontSize: '0.84rem' }}
                >
                  <Check size={14} /> Verify Defect
                </button>
                <button
                  onClick={() => handleUpdateStatus(inspectRecord._id, 'REJECTED')}
                  className="md-btn-outlined"
                  style={{ color: 'var(--error)', borderColor: 'var(--error)', fontSize: '0.84rem' }}
                >
                  <X size={14} /> Mark False Alarm
                </button>
              </div>

              <button
                onClick={() => handleDeleteSingle(inspectRecord._id)}
                className="md-btn-outlined"
                style={{ color: 'var(--error)', fontSize: '0.84rem' }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Municipal Road Audit Report Modal (Print Ready) */}
      {showAuditReport && (
        <div className="md-dialog-overlay" onClick={() => setShowAuditReport(false)}>
          <div
            className="md-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Public Works & Highway Infrastructure Audit
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  Road Surface Condition & Distress Assessment Report
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                  Standard ASTM D6433 Pavement Condition Index (PCI) Engineering Audit
                </div>
              </div>
              <button onClick={() => setShowAuditReport(false)} className="md-btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* Audit Summary Box */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 600 }}>NETWORK PCI</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: currentPci.color }}>{currentPci.pciScore} / 100</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: currentPci.color, display: 'block' }}>{currentPci.rating}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 600 }}>HAZARD LEVEL</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: currentPci.hazardColor }}>{currentPci.hazardLevel}</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{currentPci.urgency}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 600 }}>TOTAL DISTRESSES</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{filteredRecords.length}</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Monitored items</span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 600 }}>REPAIR ESTIMATE</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{currentPci.estimatedCostPerSqm.usd}/m²</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{currentPci.estimatedCostPerSqm.inr}/sqm</span>
              </div>
            </div>

            {/* Engineering Action */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Recommended Engineering Intervention
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                {currentPci.recommendedAction}
              </div>
            </div>

            {/* Itemized Defect Tally */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '0.5rem' }}>Code</th>
                  <th style={{ padding: '0.5rem' }}>Distress Classification</th>
                  <th style={{ padding: '0.5rem' }}>Count</th>
                  <th style={{ padding: '0.5rem' }}>ASTM Deduct Impact</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 700, color: '#dc2626' }}>D40</td>
                  <td style={{ padding: '0.5rem' }}>Potholes & Cavity Depressions</td>
                  <td style={{ padding: '0.5rem', fontWeight: 700 }}>{filteredRecords.filter((r) => r.damageType === 'D40').length}</td>
                  <td style={{ padding: '0.5rem', color: '#dc2626' }}>High Impact Deduct</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 700, color: '#d97706' }}>D20</td>
                  <td style={{ padding: '0.5rem' }}>Alligator / Structural Fatigue Cracking</td>
                  <td style={{ padding: '0.5rem', fontWeight: 700 }}>{filteredRecords.filter((r) => r.damageType === 'D20').length}</td>
                  <td style={{ padding: '0.5rem', color: '#d97706' }}>Structural Base Deduct</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 700, color: '#0284c7' }}>D10</td>
                  <td style={{ padding: '0.5rem' }}>Transverse Thermal Cracks</td>
                  <td style={{ padding: '0.5rem', fontWeight: 700 }}>{filteredRecords.filter((r) => r.damageType === 'D10').length}</td>
                  <td style={{ padding: '0.5rem', color: '#0284c7' }}>Thermal Shrinkage Deduct</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 700, color: '#2563eb' }}>D00</td>
                  <td style={{ padding: '0.5rem' }}>Longitudinal Joint Cracking</td>
                  <td style={{ padding: '0.5rem', fontWeight: 700 }}>{filteredRecords.filter((r) => r.damageType === 'D00').length}</td>
                  <td style={{ padding: '0.5rem', color: '#2563eb' }}>Pavement Joint Deduct</td>
                </tr>
              </tbody>
            </table>

            {/* Engineer Sign-off Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed #cbd5e1' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>CIVIL INFRASTRUCTURE INSPECTOR</div>
                <div style={{ borderBottom: '1px solid #94a3b8', height: '36px', marginTop: '4px' }}></div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Signature & License ID</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>MUNICIPAL HIGHWAY AUTHORITY APPROVAL</div>
                <div style={{ borderBottom: '1px solid #94a3b8', height: '36px', marginTop: '4px' }}></div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Date & Official Stamp</div>
              </div>
            </div>

            {/* Print Action */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setShowAuditReport(false)} className="md-btn-outlined">
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="md-btn-filled"
              >
                <Printer size={15} /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Municipal Work-Order Ticket Modal */}
      <WorkOrderModal
        isOpen={showWorkOrder}
        onClose={() => setShowWorkOrder(false)}
        roadName={filteredRecords[0]?.roadName || 'Monitored Highway Corridors'}
        latitude={filteredRecords[0]?.latitude}
        longitude={filteredRecords[0]?.longitude}
        pci={currentPci}
        detections={filteredRecords}
      />
    </div>
  );
}
