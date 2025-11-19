import { useEffect, useState } from "react";

export default function TallyPage(){
  const [board, setBoard] = useState(null);
  const [verify, setVerify] = useState(null);

  useEffect(()=>{
    async function load(){
      const r = await fetch("http://localhost:8000/bulletin_board");
      const j = await r.json();
      setBoard(j.board);
      const v = await fetch("http://localhost:8000/verify/reconstruct");
      const vv = await v.json();
      setVerify(vv);
    }
    load();
  },[]);

  return (
    <div style={{padding:20}}>
      <h1>Tally & Bulletin Board</h1>
      <h3>Bulletin Board (recent first)</h3>
      <pre style={{maxHeight:400, overflow:"auto", background:"#f7f7f7", padding:10}}>{board ? JSON.stringify(board.slice().reverse(), null, 2) : "Loading..."}</pre>

      <h3>Reconstruction / Verification</h3>
      <pre style={{background:"#f7f7f7", padding:10}}>{verify ? JSON.stringify(verify, null, 2) : "Loading..."}</pre>

      <div style={{marginTop:20}}>
        <form method="post" action="http://localhost:8000/tally/compute" target="_blank">
          <input type="hidden" name="secret" value="admin-secret-demo" />
          <button type="submit">Compute Tally (admin)</button>
        </form>
      </div>
    </div>
  );
}
