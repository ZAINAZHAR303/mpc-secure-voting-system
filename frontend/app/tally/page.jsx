"use client";

import { useEffect, useState } from "react";

export default function TallyPage() {
  const [board, setBoard] = useState(null);
  const [verify, setVerify] = useState(null);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState(null);
  const apiBase = "http://localhost:8000";

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`${apiBase}/bulletin_board`);
        const j = await r.json();
        setBoard(j.board || []);
      } catch (e) {
        setBoard([]);
        setError("Failed to load bulletin board");
      }
      try {
        const v = await fetch(`${apiBase}/verify/reconstruct`);
        const vv = await v.json();
        setVerify(vv);
      } catch (e) {
        setVerify(null);
        setError(prev => prev || "Failed to fetch verification");
      }
    }
    load();
  }, []);

  return (
    <div className="app-shell">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Public bulletin board &amp; tally</div>
            <div className="card-subtitle">
              Inspect submitted commitments and verify that the final tally
              matches the published shares.
            </div>
          </div>
          <div className="pill">Auditability · end-to-end verifiability</div>
        </div>

        <div className="grid-two">
          <div className="panel">
            <div className="panel-title">Bulletin board (recent first)</div>

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  borderRadius: 8,
                  padding: 10,
                  background: "#ffffff",
                  border: "1px solid rgba(203,213,225,0.7)",
                  color: "#374151",
                  fontSize: "0.85rem",
                }}
              >
                <strong>Legend:</strong>
                <div style={{ marginTop: 6 }}>
                  <div><strong>type</strong>: event type (`token_issued`, `vote_submitted`)</div>
                  <div><strong>voter_id</strong>: voter identifier (demo)</div>
                  <div><strong>token</strong>: EA-signed token (one-time use)</div>
                  <div><strong>commits</strong>: per-share commitments (hashes)</div>
                  <div><strong>ts</strong>: timestamp (seconds since epoch)</div>
                </div>
              </div>
            </div>

            <div style={{ maxHeight: 360, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {board === null && <div>Loading bulletin board...</div>}
              {board && board.slice().reverse().map((entry, idx) => {
                const ts = entry.ts ? new Date(entry.ts * 1000).toLocaleString() : "-";
                const isExpanded = expandedIndex === idx;
                const maskToken = tok => {
                  if (!tok) return "-";
                  // show first part and last 6 chars
                  try {
                    if (tok.length <= 16) return tok;
                    return tok.slice(0, 12) + "…" + tok.slice(-6);
                  } catch { return tok; }
                };

                return (
                  <div key={idx} style={{ padding: 10, borderRadius: 8, background: "#fff", border: "1px solid rgba(226,232,240,0.9)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ padding: '4px 8px', borderRadius: 999, background: entry.type === 'vote_submitted' ? 'rgba(59,130,246,0.12)' : 'rgba(99,102,241,0.12)', color: '#1e3a8a', fontWeight: 600, fontSize: '0.78rem' }}>{entry.type}</div>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{entry.voter_id || '-'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{ts}</div>
                        <button
                          type="button"
                          className="button-ghost"
                          style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                          onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        >
                          {isExpanded ? 'Hide details' : 'Show details'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ minWidth: 78, color: '#6b7280' }}>Token</div>
                          <div style={{ fontFamily: 'monospace', color: '#111827', overflowWrap: 'anywhere' }}>{entry.token || '-'}</div>
                          {entry.token && (
                            <button
                              type="button"
                              className="button-ghost"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              onClick={() => navigator.clipboard.writeText(entry.token)}
                            >
                              Copy
                            </button>
                          )}
                        </div>

                        {entry.commits && (
                          <div>
                            <div style={{ color: '#6b7280', marginBottom: 6 }}>Commitments</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {entry.commits.map((c, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ fontSize: '0.7rem', color: '#6b7280', minWidth: 18 }}>#{i + 1}</div>
                                  <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#111827', wordBreak: 'break-all', padding: '6px 8px', borderRadius: 6, background: '#f8fafc', border: '1px solid rgba(203,213,225,0.6)', flex: 1 }}>{c}</div>
                                  <button
                                    type="button"
                                    className="button-ghost"
                                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                    onClick={() => navigator.clipboard.writeText(c)}
                                  >
                                    Copy
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Reconstruction / verification</div>

            {verify ? (
              <div
                style={{
                  borderRadius: 8,
                  padding: 10,
                  background: "#ffffff",
                  border: "1px solid rgba(203,213,225,0.7)",
                  fontSize: "0.85rem",
                  color: "#111827",
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <strong>Total (reconstructed):</strong> {verify.total}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <strong>Local sums per authority:</strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {verify.local_sums && verify.local_sums.map((s, i) => (
                    <li key={i} style={{ fontSize: '0.82rem', color: '#374151' }}>
                      Authority {i + 1}: {s}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#6b7280' }}>
                  Explanation: {verify.explanation}
                </div>
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 8,
                  padding: 10,
                  background: "#f9fafb",
                  border: "1px solid rgba(148,163,184,0.7)",
                  fontSize: "0.8rem",
                  color: "#6b7280",
                }}
              >
                Loading authority sums...
              </div>
            )}

            <div className="card-subtitle" style={{ marginTop: 8 }}>
              Anyone can recompute the total by summing the local sums
              modulo the shared field, and compare with the published
              result.
            </div>

            <div style={{ marginTop: 16 }}>
              <form
                method="post"
                action={`${apiBase}/tally/compute`}
                target="_blank"
              >
                <button className="button-primary" type="submit">
                  Compute tally (admin trigger)
                </button>
                <span
                  style={{
                    fontSize: "0.75rem",
                    marginLeft: 10,
                    color: "#9ca3af",
                  }}
                >
                  Uses demo secret "admin-secret-demo" on the backend.
                </span>
              </form>
            </div>
          </div>
        </div>

        {error && (
          <div className="status-bar error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        <div className="footer-row">
          <a href="/" className="link-pill">
            ← Back to voting
          </a>
          <div>Everything here is public and auditable (demo).</div>
        </div>
      </div>
    </div>
  );
}
