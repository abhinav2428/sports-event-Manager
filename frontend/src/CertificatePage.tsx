/**
 * CertificatePage — opens in a new tab, designed to be printed as PDF.
 * URL: /certificate?resultId=xxx
 */
import { useEffect, useState } from 'react'
import { resultsApi } from './api'

interface CertData {
  participant_name: string
  event_name: string
  meet_name: string
  meet_venue: string | null
  position: string
  rank: number | null
  time_display: string
  finalized_at: string | null
  is_relay: boolean
}

export default function CertificatePage() {
  const params = new URLSearchParams(window.location.search)
  const resultId = params.get('resultId')
  const [data, setData] = useState<CertData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!resultId) { setError('No result ID provided.'); return }
    resultsApi.certificateData(resultId)
      .then(r => setData(r.data))
      .catch(() => setError('Could not load certificate data. Make sure the result is finalized.'))
  }, [resultId])

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Georgia, serif', color:'#c00' }}>
      <p>{error}</p>
    </div>
  )

  if (!data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Georgia, serif', color:'#555' }}>
      <p>Loading certificate…</p>
    </div>
  )

  const issuedDate = data.finalized_at
    ? new Date(data.finalized_at).toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' })
    : new Date().toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Cinzel:wght@400;600;700&family=Great+Vibes&family=Inter:wght@300;400;500;600&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          background: #e8e8e8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          padding: 20px;
        }

        .print-btn {
          margin-bottom: 16px;
          padding: 10px 28px;
          background: #1a3a6b;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: background 0.2s;
        }
        .print-btn:hover { background: #0f2450; }

        @media print {
          body { background: white; padding: 0; }
          .no-print { display: none !important; }
          .cert-wrapper { box-shadow: none !important; }
        }

        /* ── Certificate wrapper ── */
        .cert-wrapper {
          width: 794px;
          height: 562px;
          position: relative;
          background: white;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
        }

        /* ── Top blue header bar ── */
        .cert-top-bar {
          width: 100%;
          height: 14px;
          background: linear-gradient(90deg, #1a3a6b 0%, #2a5cbf 60%, #1e4fa0 100%);
        }

        /* ── Main content area ── */
        .cert-body {
          display: flex;
          flex: 1;
          position: relative;
        }

        /* ── Giant blue arc (right side) ── */
        .cert-arc {
          position: absolute;
          right: -80px;
          top: -80px;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          border: 60px solid #1e4fa0;
          opacity: 0.15;
          pointer-events: none;
        }
        .cert-arc-2 {
          position: absolute;
          right: -30px;
          bottom: -120px;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          border: 50px solid #2a5cbf;
          opacity: 0.12;
          pointer-events: none;
        }

        /* ── Left panel (signatures area) ── */
        .cert-left {
          width: 130px;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          padding: 24px 12px 24px 20px;
          border-right: 1px solid #e0e0e0;
          background: #fafafa;
          flex-shrink: 0;
          z-index: 2;
        }

        .sig-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .sig-line {
          font-family: 'Great Vibes', cursive;
          font-size: 26px;
          color: #222;
          line-height: 1.1;
          text-align: center;
        }

        .sig-divider {
          width: 70px;
          height: 1px;
          background: #999;
        }

        .sig-title {
          font-size: 9px;
          color: #555;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-weight: 600;
          text-align: center;
        }

        /* ── Right content ── */
        .cert-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 28px 36px 20px 36px;
          position: relative;
          z-index: 2;
        }

        /* ── Top-right logos row ── */
        .cert-logos {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .cert-logo-badge {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          background: linear-gradient(135deg, #1a3a6b, #2a5cbf);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-align: center;
          line-height: 1.3;
          padding: 4px;
        }

        .cert-logo-meet {
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          font-size: 7px;
          padding: 6px;
        }

        /* ── Title block ── */
        .cert-title {
          font-family: 'Cinzel', serif;
          font-size: 42px;
          font-weight: 700;
          color: #1a3a6b;
          letter-spacing: 4px;
          line-height: 1;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .cert-subtitle {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          color: #444;
          font-style: italic;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .cert-presented {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #888;
          font-weight: 500;
          margin-bottom: 12px;
        }

        /* ── Gold divider ── */
        .cert-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .cert-divider-line {
          flex: 1;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, #c9a846, transparent);
        }
        .cert-divider-diamond {
          width: 8px;
          height: 8px;
          background: #c9a846;
          transform: rotate(45deg);
        }

        /* ── Participant name ── */
        .cert-name {
          font-family: 'Cinzel', serif;
          font-size: 30px;
          font-weight: 700;
          color: #1a2e5a;
          letter-spacing: 2px;
          text-transform: uppercase;
          line-height: 1.1;
          margin-bottom: 16px;
        }

        /* ── Body text ── */
        .cert-body-text {
          font-size: 11.5px;
          color: #333;
          line-height: 1.9;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cert-body-text .row {
          display: flex;
          gap: 6px;
          align-items: baseline;
        }

        .cert-body-text .label {
          color: #888;
          font-style: italic;
          width: 56px;
          flex-shrink: 0;
          font-size: 10px;
        }

        .cert-body-text .value {
          font-weight: 600;
          color: #111;
        }

        .cert-body-text .highlight {
          color: #1a3a6b;
          font-weight: 700;
        }

        /* ── Bottom blue bar ── */
        .cert-bottom-bar {
          width: 100%;
          height: 10px;
          background: linear-gradient(90deg, #1a3a6b 0%, #2a5cbf 60%, #1e4fa0 100%);
          margin-top: auto;
        }

        /* ── Gold seal ── */
        .cert-seal {
          position: absolute;
          bottom: 28px;
          right: 36px;
          width: 72px;
          height: 72px;
          z-index: 10;
        }

        .cert-seal svg {
          width: 72px;
          height: 72px;
        }

        /* Responsive for smaller screens */
        @media (max-width: 860px) {
          .cert-wrapper { width: 100%; height: auto; min-height: 440px; }
          .cert-title { font-size: 28px; }
          .cert-name { font-size: 20px; }
        }
      `}</style>

      <button className="no-print print-btn" onClick={() => window.print()}>
        🖨️ Print / Save as PDF
      </button>

      <div className="cert-wrapper">
        {/* Top blue bar */}
        <div className="cert-top-bar" />

        <div className="cert-body">
          {/* Decorative arcs */}
          <div className="cert-arc" />
          <div className="cert-arc-2" />

          {/* Left: signature panel */}
          <div className="cert-left">
            <div className="sig-block">
              <div className="sig-line">Rlosh</div>
              <div className="sig-divider" />
              <div className="sig-title">Director</div>
            </div>
            <div className="sig-block">
              <div className="sig-line">R. Preen</div>
              <div className="sig-divider" />
              <div className="sig-title">Dean Students</div>
            </div>
            <div className="sig-block">
              <div className="sig-line">Kumal</div>
              <div className="sig-divider" />
              <div className="sig-title">PIC Sports</div>
            </div>
          </div>

          {/* Right: main certificate content */}
          <div className="cert-right">
            {/* Logos top-right */}
            <div className="cert-logos">
              <div className="cert-logo-badge">
                INTER-IIT<br/>SPORTS<br/>MEET
              </div>
              <div className="cert-logo-badge cert-logo-meet">
                SPORTS<br/>EVENT<br/>MGR
              </div>
            </div>

            {/* Title */}
            <div className="cert-title">Certificate</div>
            <div className="cert-subtitle">of Merit</div>
            <div className="cert-presented">Presented to</div>

            {/* Gold divider */}
            <div className="cert-divider">
              <div className="cert-divider-line" />
              <div className="cert-divider-diamond" />
              <div className="cert-divider-line" />
            </div>

            {/* Name */}
            <div className="cert-name">{data.participant_name}</div>

            {/* Body details */}
            <div className="cert-body-text">
              <div className="row">
                <span className="label">for</span>
                <span className="value">securing&nbsp;<span className="highlight">{data.position}</span>&nbsp;position</span>
              </div>
              <div className="row">
                <span className="label">in</span>
                <span className="value highlight">{data.event_name}</span>
              </div>
              {data.time_display && !['DNS','DNF','DQ','NT'].includes(data.time_display) && (
                <div className="row">
                  <span className="label">time</span>
                  <span className="value">{data.time_display}</span>
                </div>
              )}
              <div className="row">
                <span className="label">at</span>
                <span className="value">{data.meet_name}{data.meet_venue ? `, ${data.meet_venue}` : ''}</span>
              </div>
              <div className="row">
                <span className="label">on</span>
                <span className="value">{issuedDate}</span>
              </div>
            </div>

            {/* Gold seal bottom-right */}
            <div className="cert-seal">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f5d36e"/>
                    <stop offset="50%" stopColor="#c9a846"/>
                    <stop offset="100%" stopColor="#a07c20"/>
                  </linearGradient>
                </defs>
                {/* Starburst */}
                {Array.from({length: 16}).map((_, i) => {
                  const angle = (i * 360) / 16
                  const rad = (angle * Math.PI) / 180
                  const x2 = 50 + 46 * Math.cos(rad)
                  const y2 = 50 + 46 * Math.sin(rad)
                  return <line key={i} x1="50" y1="50" x2={x2} y2={y2} stroke="url(#goldGrad)" strokeWidth="3" />
                })}
                <circle cx="50" cy="50" r="30" fill="url(#goldGrad)" />
                <circle cx="50" cy="50" r="27" fill="none" stroke="#fff" strokeWidth="1.5" />
                <text x="50" y="44" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#5a3a00" fontFamily="serif">CERTIFIED</text>
                <text x="50" y="54" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#5a3a00" fontFamily="serif">★</text>
                <text x="50" y="64" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#5a3a00" fontFamily="serif">MERIT</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="cert-bottom-bar" />
      </div>
    </>
  )
}
