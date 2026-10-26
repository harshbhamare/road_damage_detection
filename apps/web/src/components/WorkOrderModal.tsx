'use client';

import React from 'react';
import {
  FileText,
  Printer,
  X,
  HardHat,
  Wrench,
  CheckCircle2,
  Calendar,
  MapPin,
  DollarSign,
  ShieldCheck,
  TrendingDown,
  Layers
} from 'lucide-react';
import { PciAssessment } from '@/lib/pciEngine';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  roadName: string;
  latitude?: number | string;
  longitude?: number | string;
  pci: PciAssessment;
  detections: any[];
}

export default function WorkOrderModal({
  isOpen,
  onClose,
  roadName,
  latitude,
  longitude,
  pci,
  detections = []
}: WorkOrderModalProps) {
  if (!isOpen) return null;

  // Generate Work-Order ID from current timestamp
  const workOrderId = `WO-PWD-${Date.now().toString().slice(-6)}`;
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Aggregate Material Takeoff
  let totalAsphaltKg = 0;
  let totalSealantKg = 0;
  let totalSealantLiters = 0;
  let totalTackLiters = 0;
  let totalMillingPerimeterCm = 0;
  let totalCrackLengthM = 0;

  detections.forEach((d) => {
    const m = d.metrics;
    if (m) {
      totalAsphaltKg += m.asphalt_patch_mass_kg || 0;
      totalSealantKg += m.crack_sealant_mass_kg || 0;
      totalSealantLiters += m.crack_sealant_volume_liters || 0;
      totalTackLiters += m.tack_coat_liters || 0;
      totalMillingPerimeterCm += m.milling_perimeter_cm || 0;
      totalCrackLengthM += m.crack_length_m || 0;
    }
  });

  totalAsphaltKg = Math.round(totalAsphaltKg * 10) / 10;
  totalSealantKg = Math.round(totalSealantKg * 10) / 10;
  totalSealantLiters = Math.round(totalSealantLiters * 10) / 10;
  totalTackLiters = Math.round(totalTackLiters * 10) / 10;
  totalMillingPerimeterCm = Math.round(totalMillingPerimeterCm);
  totalCrackLengthM = Math.round(totalCrackLengthM * 10) / 10;

  // Estimated Budget Calculation
  // Asphalt: ₹12/kg ($0.15/kg)
  // Sealant: ₹180/kg ($2.20/kg)
  // Tack coat: ₹90/L ($1.10/L)
  // Labor & equipment base: ₹4,500 ($55)
  const asphaltCostInr = totalAsphaltKg * 12;
  const sealantCostInr = totalSealantKg * 180;
  const tackCostInr = totalTackLiters * 90;
  const laborEquipmentInr = 4500;
  const totalBudgetInr = Math.round(asphaltCostInr + sealantCostInr + tackCostInr + laborEquipmentInr);
  const totalBudgetUsd = (totalBudgetInr / 83.5).toFixed(2);

  return (
    <div className="md-dialog-overlay" onClick={onClose}>
      <div
        className="md-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          padding: '2rem',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#2563eb',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              Public Works & Highway Authority &bull; Civil Engineering Division
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              Maintenance Work-Order & Contractor Tender Ticket
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Standard Compliance: IRC:82-2015 &bull; ASTM D6433 PCI Survey &bull; ASTM D6690 Type II Sealants
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => window.print()}
              className="md-btn-filled"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="md-btn-icon" style={{ width: '32px', height: '32px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Ticket Metadata Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginBottom: '1.5rem',
            fontSize: '0.82rem'
          }}
        >
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>WORK ORDER NO.</span>
            <strong style={{ fontSize: '1.05rem', color: '#2563eb', fontFamily: 'monospace' }}>{workOrderId}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>DATE OF ISSUE</span>
            <strong>{currentDate}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>PRIORITY URGENCY</span>
            <strong style={{ color: pci.hazardColor }}>{pci.urgency}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>ASSET PCI SCORE</span>
            <strong style={{ color: pci.color }}>{pci.pciScore} / 100 ({pci.rating})</strong>
          </div>
        </div>

        {/* Location & Corridor */}
        <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
          <div>
            <strong>Road Corridor:</strong> {roadName || 'Highway Section'}
          </div>
          <div>
            <strong>GPS Geolocation:</strong> {latitude && longitude ? `${latitude}, ${longitude}` : 'Coordinate picker pending verification'}
          </div>
          <div>
            <strong>Civil Engineering Diagnosis:</strong> {pci.recommendedAction}
          </div>
        </div>

        {/* Bill of Quantities (BOQ) Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bill of Quantities (BOQ) & Material Takeoff
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '0.55rem' }}>Item</th>
                <th style={{ padding: '0.55rem' }}>Material / Civil Work Specification</th>
                <th style={{ padding: '0.55rem' }}>Quantity</th>
                <th style={{ padding: '0.55rem' }}>Unit</th>
                <th style={{ padding: '0.55rem' }}>Standard Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.55rem', fontWeight: 700 }}>1</td>
                <td style={{ padding: '0.55rem' }}>Hot-Poured Rubberized Bitumen Crack Sealant</td>
                <td style={{ padding: '0.55rem', fontWeight: 700, color: '#2563eb' }}>{totalSealantKg || 1.8}</td>
                <td style={{ padding: '0.55rem' }}>kg ({totalSealantLiters || 1.5} L)</td>
                <td style={{ padding: '0.55rem' }}>ASTM D6690 Type II</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.55rem', fontWeight: 700 }}>2</td>
                <td style={{ padding: '0.55rem' }}>Hot Compressed Air (HCA) Lance Fissure De-dusting</td>
                <td style={{ padding: '0.55rem', fontWeight: 700 }}>{totalCrackLengthM || 3.2}</td>
                <td style={{ padding: '0.55rem' }}>Linear Meters</td>
                <td style={{ padding: '0.55rem' }}>IRC:82 Clause 4.2</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.55rem', fontWeight: 700 }}>3</td>
                <td style={{ padding: '0.55rem' }}>Compacted Dense-Graded Hot-Mix Asphalt (HMA) Patch</td>
                <td style={{ padding: '0.55rem', fontWeight: 700, color: '#dc2626' }}>{totalAsphaltKg || 18.5}</td>
                <td style={{ padding: '0.55rem' }}>kg</td>
                <td style={{ padding: '0.55rem' }}>IRC:82 Clause 4.3</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.55rem', fontWeight: 700 }}>4</td>
                <td style={{ padding: '0.55rem' }}>Bituminous Emulsion Tack Coat (RS-1) Bonding Layer</td>
                <td style={{ padding: '0.55rem', fontWeight: 700 }}>{totalTackLiters || 0.8}</td>
                <td style={{ padding: '0.55rem' }}>Liters</td>
                <td style={{ padding: '0.55rem' }}>IS:8887 / ASTM D977</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.55rem', fontWeight: 700 }}>5</td>
                <td style={{ padding: '0.55rem' }}>Diamond Blade Saw-Cut Perimeter Squaring</td>
                <td style={{ padding: '0.55rem', fontWeight: 700 }}>{totalMillingPerimeterCm || 160}</td>
                <td style={{ padding: '0.55rem' }}>cm</td>
                <td style={{ padding: '0.55rem' }}>AASHTO T-24</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Contractor Machinery & Tool Checklist */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HardHat size={16} color="#d97706" /> Required Contractor Equipment & Machinery
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
            <div>&bull; Hot Compressed Air (HCA) Lance (Min. 3000 ft/min velocity, 1200°C)</div>
            <div>&bull; Diamond Blade Crack Routing Saw (15mm × 15mm reservoir)</div>
            <div>&bull; Thermostatically Controlled Double-Boiler Sealant Melter</div>
            <div>&bull; Vibratory Plate Compactor (Min. 12 kN compaction force)</div>
          </div>
        </div>

        {/* Budget Summary Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
            marginBottom: '1.75rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>
              Estimated Civil Repair Budget
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e3a8a' }}>
              ₹{totalBudgetInr.toLocaleString()} INR (${totalBudgetUsd} USD)
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', textAlign: 'right' }}>
            <div>Material Subtotal: ₹{(asphaltCostInr + sealantCostInr + tackCostInr).toLocaleString()}</div>
            <div>Labor & Equipment: ₹{laborEquipmentInr.toLocaleString()}</div>
          </div>
        </div>

        {/* Official Sign-Off Blocks */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            paddingTop: '1.5rem',
            borderTop: '1px dashed #cbd5e1',
            fontSize: '0.75rem',
            color: '#64748b'
          }}
        >
          <div>
            <div>AUTHORIZED CIVIL ENGINEER (P.W.D.)</div>
            <div style={{ borderBottom: '1px solid #94a3b8', height: '40px', marginTop: '4px' }}></div>
            <div style={{ marginTop: '4px' }}>Name, License ID & Seal</div>
          </div>
          <div>
            <div>LICENSED HIGHWAY CONTRACTOR ACCEPTANCE</div>
            <div style={{ borderBottom: '1px solid #94a3b8', height: '40px', marginTop: '4px' }}></div>
            <div style={{ marginTop: '4px' }}>Contractor Signature & Date</div>
          </div>
        </div>
      </div>
    </div>
  );
}
