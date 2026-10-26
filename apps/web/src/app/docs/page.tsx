import { BookOpen, FileText, Server, Cpu, Database } from 'lucide-react';

export default function DocsPage() {
  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
          System Documentation & Specifications
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Comprehensive architectural, schema, and API references for developers and academic examiners.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Architecture */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <Server size={22} color="#3b82f6" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>System Architecture</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Outlines the client-server boundary, multipart media ingestion, EXIF GPS coordinate extraction, and asynchronous ML inference dispatch.
          </p>
          <code style={{ fontSize: '0.8rem', color: 'var(--text-highlight)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
            docs/architecture.md
          </code>
        </div>

        {/* Database Schema */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <Database size={22} color="#10b981" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Database Schemas</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            MongoDB collections (Media, DamageRecord, ModelVersion, ProcessingJob) with strict GeoJSON Point indexing (`2dsphere`) for spatial queries.
          </p>
          <code style={{ fontSize: '0.8rem', color: 'var(--text-highlight)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
            docs/database_schema.md
          </code>
        </div>

        {/* Dataset Dictionary */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <FileText size={22} color="#f59e0b" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Dataset Dictionary</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Detailed breakdown of damage categories D00, D10, D20, and D40, bounding box formatting (Pascal VOC vs YOLO), and QA check protocols.
          </p>
          <code style={{ fontSize: '0.8rem', color: 'var(--text-highlight)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
            docs/dataset_dictionary.md
          </code>
        </div>

        {/* REST API Specs */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <Cpu size={22} color="#8b5cf6" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>API Specifications</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            REST specifications for Express backend (`/api/media/upload`, `/api/damage/spatial`) and FastAPI ML microservice (`/predict`, `/health`).
          </p>
          <code style={{ fontSize: '0.8rem', color: 'var(--text-highlight)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
            docs/api_specs.md
          </code>
        </div>
      </div>
    </div>
  );
}
