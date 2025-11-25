"use client";

import { useState } from "react";

export default function Home() {
  const [voterId, setVoterId] = useState("");
  const [token, setToken] = useState("");
  const [vote, setVote] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const apiBase = "https://mpc-secure-voting-system-1.onrender.com";

  async function requestToken() {
    setError("");
    setMessage("");
    if (!voterId) {
      setError("Enter voter id first");
      return;
    }
    try {
      const res = await fetch(`${apiBase}/ea/issue_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter_id: voterId }),
      });
      const j = await res.json();
      if (res.ok) {
        setToken(j.token);
        setMessage("Token issued (demo).");
      } else {
        setError("Error requesting token");
        setMessage(JSON.stringify(j));
      }
    } catch (err) {
      setError("Network error requesting token");
    }
  }

  function makeShares(secret) {
    const FIELD = BigInt(2) ** BigInt(61) - BigInt(1);
    const shares = [];
    for (let i = 0; i < 2; i++) {
      const s = BigInt(Math.floor(Math.random() * 1e9));
      shares.push(s % FIELD);
    }
    const sum = shares.reduce((a, b) => (a + b) % FIELD, BigInt(0));
    const last = (BigInt(secret) - sum + FIELD) % FIELD;
    shares.push(last);
    return shares;
  }

  async function sha256Hex(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function submitVote() {
    setError("");
    setMessage("");
    if (!token) {
      setError("Request a token before submitting a vote.");
      return;
    }
    try {
      const sharesBig = makeShares(vote);
      const shares = sharesBig.map(s => Number(s % BigInt(Number.MAX_SAFE_INTEGER)));
      const proof = await sha256Hex(shares.join("|"));

      const commits = [];
      for (const s of shares) {
        const r = Math.random().toString(36).slice(2, 12);
        commits.push(await sha256Hex(String(s) + r));
      }

      const payload = {
        token: token,
        voter_id: voterId,
        shares,
        commits,
        proof,
      };

      const res = await fetch(`${apiBase}/vote/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.ok) {
        setMessage("Vote submitted successfully.");
      } else {
        setError("Error submitting vote");
        setMessage(JSON.stringify(j));
      }
    } catch (err) {
      setError("Network error submitting vote");
    }
  }

  return (
    <div className="app-shell">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">MPC Secure Voting Demo</div>
            <div className="card-subtitle">
              Cast a private yes/no vote. Authorities only ever see masked
              shares.
            </div>
          </div>
          <div className="pill">3-authority additive sharing · demo only</div>
        </div>

        <div className="grid-two">
          <div className="panel">
            <div className="panel-title">1. Voter identity &amp; token</div>
            <div className="field-group">
              <div className="field-label">Voter identifier</div>
              <div className="field-input-row">
                <input
                  className="input"
                  placeholder="e.g. alice-01"
                  value={voterId}
                  onChange={e => setVoterId(e.target.value)}
                />
                <button className="button-primary" onClick={requestToken}>
                  Request token
                </button>
              </div>
            </div>

            <div className="field-group">
              <div className="field-label">Issued token (one-time use)</div>
              <div className="token-box">
                {token || "Token will appear here once issued"}
              </div>
              <div className="meta-row">
                <span>Issued by the Election Authority (EA).</span>
                <span>Not blind-signed in this demo.</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">2. Prepare and submit vote</div>
            <div className="field-group">
              <div className="field-label">Vote choice</div>
              <div className="field-input-row">
                <select
                  className="select"
                  value={vote}
                  onChange={e => setVote(Number(e.target.value))}
                >
                  <option value={0}>0 — No</option>
                  <option value={1}>1 — Yes</option>
                </select>
                <button className="button-primary" onClick={submitVote}>
                  Submit vote
                </button>
              </div>
            </div>

            <div className="card-subtitle">
              Under the hood, your vote is split into 3 random shares and
              sent to separate authorities. No single authority ever sees your
              raw vote.
            </div>
          </div>
        </div>

        {(error || message) && (
          <div className={"status-bar" + (error ? " error" : "")}> 
            {error ? <strong>{error}</strong> : null}
            {message && (
              <div style={{ marginTop: error ? 4 : 0 }}>{message}</div>
            )}
          </div>
        )}

        <div className="footer-row">
          <div>
            <span style={{ color: "#9ca3af" }}>Next step:</span>{" "}
            <a href="/tally" className="link-pill">
              View public bulletin board &amp; tally →
            </a>
          </div>
          <div>Field: 2^61 − 1 · Z / additive sharing (demo)</div>
        </div>
      </div>
    </div>
  );
}
