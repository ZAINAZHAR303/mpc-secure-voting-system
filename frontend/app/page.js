"use client";

import { useState } from "react";

export default function Home() {
  const [voterId, setVoterId] = useState("");
  const [token, setToken] = useState("");
  const [vote, setVote] = useState(1);
  const [message, setMessage] = useState("");

  const apiBase = "http://localhost:8000";

  async function requestToken() {
    if (!voterId) return setMessage("Enter voter id first");
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
        setMessage("Error: " + JSON.stringify(j));
      }
    } catch (err) {
      setMessage("Network error requesting token");
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
    if (!token) return setMessage("Request token first");
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
      if (res.ok) setMessage("Vote submitted: " + JSON.stringify(j));
      else setMessage("Error: " + JSON.stringify(j));
    } catch (err) {
      setMessage("Network error submitting vote");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>MPC Voting Demo - Frontend</h1>
      <div style={{ marginBottom: 10 }}>
        <label>
          Voter ID:{" "}
          <input
            value={voterId}
            onChange={e => setVoterId(e.target.value)}
          />
        </label>
        <button onClick={requestToken} style={{ marginLeft: 10 }}>
          Request Token
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div>
          Issued Token:{" "}
          <code style={{ wordBreak: "break-all" }}>{token}</code>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          Vote:
          <select
            value={vote}
            onChange={e => setVote(Number(e.target.value))}
          >
            <option value={0}>0 (No)</option>
            <option value={1}>1 (Yes)</option>
          </select>
        </label>
        <button onClick={submitVote} style={{ marginLeft: 10 }}>
          Submit Vote
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <a href="/tally">View tally & bulletin board 	</a>
      </div>

      <div style={{ marginTop: 20, color: "green" }}>{message}</div>
    </div>
  );
}
