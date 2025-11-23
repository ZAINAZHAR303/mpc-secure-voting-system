"use client";

import { useEffect, useState } from "react";

export default function TallyPage() {
  const [board, setBoard] = useState(null);
  const [verify, setVerify] = useState(null);
  const [error, setError] = useState("");
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
            <pre
              style={{
                maxHeight: 360,
                overflow: "auto",
                background: "#020617",
                padding: 10,
                borderRadius: "0.75rem",
                border: "1px solid rgba(30,64,175,0.8)",
                fontSize: "0.75rem",
              }}
            >
              {board
                ? JSON.stringify(board.slice().reverse(), null, 2)
                : "Loading bulletin board..."}
            </pre>
          </div>

          <div className="panel">
            <div className="panel-title">Reconstruction / verification</div>
            <pre
              style={{
                background: "#020617",
                padding: 10,
                borderRadius: "0.75rem",
                border: "1px solid rgba(30,64,175,0.8)",
                fontSize: "0.8rem",
              }}
            >
              {verify
                ? JSON.stringify(verify, null, 2)
                : "Loading authority sums..."}
            </pre>

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
