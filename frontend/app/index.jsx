import { useState } from "react";

export default function Home() {
  const [voterId, setVoterId] = useState("");
  const [token, setToken] = useState("");
  const [vote, setVote] = useState(1);
  const [message, setMessage] = useState("");

  const apiBase = "http://localhost:8000";

  async function requestToken() {
    if (!voterId) return setMessage("Enter voter id first");
    const res = await fetch(`${apiBase}/ea/issue_token`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ voter_id: voterId }),
    });
    const j = await res.json();
    if (res.ok) {
      setToken(j.token);
      setMessage("Token issued (demo).");
    } else {
      setMessage("Error: " + JSON.stringify(j));
    }
  }

  function makeShares(secret) {
    // Simple client-side additive sharing consistent with backend FIELD
    const FIELD = BigInt(2)**BigInt(61) - BigInt(1);
    const shares = [];
    for (let i=0;i<2;i++){
      const s = BigInt(Math.floor(Math.random() * Number(1e9)));
      shares.push(s % FIELD);
    }
    const sum = shares.reduce((a,b) => a + b, BigInt(0)) % FIELD;
    const last = (BigInt(secret) - sum) % FIELD;
    shares.push((last + FIELD) % FIELD);
    return shares.map(s => s.toString());
  }

  function makeCommits(shares) {
    // Matches backend's hash_commit (value + random r)
    function hash_commit(v, r){
      return require("crypto").createHash("sha256").update(v + r).digest("hex");
    }
    const commits = [];
    for (let s of shares) {
      const r = Math.random().toString(36).slice(2,12);
      // NOTE: we need to send also r in real scheme or do a ZK. For demo we don't send r.
      commits.push(hash_commit(s, r));
    }
    return commits;
  }

  async function submitVote() {
    if (!token) return setMessage("Request token first");
    // for demo simplicity, we compute shares client-side and a naive proof (hash of shares)
    const shares = makeShares(vote);  // array of stringified ints
    const proof = require("crypto").createHash("sha256").update(shares.join("|")).digest("hex");
    // create commits with random r locally. In our demo backend we expect commitment strings only.
    const commits = shares.map(s => require("crypto").createHash("sha256").update(s + Math.random().toString(36)).digest("hex"));

    const payload = {
      token: token,
      voter_id: voterId,
      shares: shares.map(s => Number(s % BigInt(2**53-1))), // convert to JS number for demo
      commits: commits,
      proof: proof
    };

    const res = await fetch(`${apiBase}/vote/submit`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const j = await res.json();
    if (res.ok) setMessage("Vote submitted: " + JSON.stringify(j));
    else setMessage("Error: " + JSON.stringify(j));
  }

  return (
    <div style={{padding:20}}>
      <h1>MPC Voting Demo - Frontend</h1>
      <div style={{marginBottom:10}}>
        <label>Voter ID: <input value={voterId} onChange={e=>setVoterId(e.target.value)} /></label>
        <button onClick={requestToken} style={{marginLeft:10}}>Request Token</button>
      </div>

      <div style={{marginBottom:10}}>
        <div>Issued Token: <code style={{wordBreak:"break-all"}}>{token}</code></div>
      </div>

      <div style={{marginBottom:10}}>
        <label>Vote:
          <select value={vote} onChange={e=>setVote(Number(e.target.value))}>
            <option value={0}>0 (No)</option>
            <option value={1}>1 (Yes)</option>
          </select>
        </label>
        <button onClick={submitVote} style={{marginLeft:10}}>Submit Vote</button>
      </div>

      <div style={{marginTop:20}}>
        <a href="/tally">View tally & bulletin board →</a>
      </div>

      <div style={{marginTop:20, color:"green"}}>{message}</div>
    </div>
  );
}
