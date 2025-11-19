"use client";

import { useEffect, useState } from "react";

export default function TallyPage() {
  const [board, setBoard] = useState(null);
  const [verify, setVerify] = useState(null);
  const apiBase = "http://localhost:8000";

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`${apiBase}/bulletin_board`);
        const j = await r.json();
        setBoard(j.board || []);
      } catch (e) {
        setBoard([]);
      }
      try {
        const v = await fetch(`${apiBase}/verify/reconstruct`);
        const vv = await v.json();
        setVerify(vv);
      } catch (e) {
        setVerify({ error: "Failed to fetch verification" });
      }
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Tally &amp; Bulletin Board</h1>
      <h3>Bulletin Board (recent first)</h3>
      <pre
        style={{
          maxHeight: 400,
          overflow: "auto",
          background: "#f7f7f7",
          padding: 10,
        }}
      >
        {board
          ? JSON.stringify(board.slice().reverse(), null, 2)
          : "Loading..."}
      </pre>

      <h3>Reconstruction / Verification</h3>
      <pre style={{ background: "#f7f7f7", padding: 10 }}>
        {verify ? JSON.stringify(verify, null, 2) : "Loading..."}
      </pre>

      <div style={{ marginTop: 20 }}>
        <form
          method="post"
          action={`${apiBase}/tally/compute`}
          target="_blank"
        >
          <input type="hidden" name="secret" value="admin-secret-demo" />
          <button type="submit">Compute Tally (admin)</button>
        </form>
      </div>
    </div>
  );
}
