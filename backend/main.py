"""
MPC Secure Voting Prototype - FastAPI backend (educational)
Features:
 - 3 simulated authorities (additive sharing)
 - simple (hash-based) commitments
 - one-time tokens issued by EA (HMAC-signed)
 - bulletin board storing submissions, commitments and proofs
 - tally & verification endpoints

NOT production secure. Replace simplified crypto with Pedersen commitments, real ZK proofs,
blind signatures, TLS, and distributed triple generation for production use.
"""

from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import secrets, hashlib, hmac, time, json
from itsdangerous import TimestampSigner

app = FastAPI(title="MPC Voting Prototype")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Configuration (demo) ----------
NUM_AUTHORITIES = 3
FIELD = 2**61 - 1  # prime-ish field for additive sharing arithmetic (demo)
EA_SECRET = b"super-secret-ea-key"  # use env var in real deployments
TOKEN_SIGNER = TimestampSigner(EA_SECRET)

# ---------- In-memory stores (demo) ----------
# issued_tokens[token] = {"voter_id":..., "used":False, "issued_at":...}
issued_tokens: Dict[str, Dict[str, Any]] = {}

# submissions: list of { voter_id, token, shares: [s0..s2], commits: [c0..c2], proof: ... }
submissions: List[Dict[str, Any]] = []

# bulletin_board: append-only list of events (commits, proofs, authority announcements)
bulletin_board: List[Dict[str, Any]] = []

# authority local storage (for simulation): authority_shares[i] = {voter_id: share}
authority_shares: List[Dict[str, int]] = [dict() for _ in range(NUM_AUTHORITIES)]
authority_commits: List[Dict[str, str]] = [dict() for _ in range(NUM_AUTHORITIES)]

# ---------- Utility functions ----------
def hash_commit(value: int, r: str) -> str:
    """
    Simple hash-based commitment (NOT binding/hiding like Pedersen).
    Use Pedersen commitments on EC in real system.
    """
    m = hashlib.sha256()
    m.update(str(value).encode())
    m.update(r.encode())
    return m.hexdigest()

def make_token(voter_id: str) -> str:
    """Issue a timestamped token signed by EA. Not blind; for demo only."""
    payload = f"{voter_id}:{secrets.token_hex(8)}"
    token = TOKEN_SIGNER.sign(payload.encode()).decode()
    issued_tokens[token] = {"voter_id": voter_id, "used": False, "issued_at": time.time()}
    bulletin_board.append({"type": "token_issued", "voter_id": voter_id, "token": token, "ts": time.time()})
    return token

def verify_token(token: str) -> Dict[str, Any]:
    try:
        payload = TOKEN_SIGNER.unsign(token, max_age=60*60*24)  # tokens valid for 24h in demo
        payload = payload.decode()
        if token not in issued_tokens:
            raise HTTPException(status_code=400, detail="Token unknown to EA")
        tokmeta = issued_tokens[token]
        if tokmeta["used"]:
            raise HTTPException(status_code=400, detail="Token already used")
        return tokmeta
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid token: {e}")

def share_secret(secret: int, n: int = NUM_AUTHORITIES) -> List[int]:
    shares = []
    for _ in range(n-1):
        shares.append(secrets.randbelow(FIELD))
    s_sum = sum(shares) % FIELD
    last = (secret - s_sum) % FIELD
    shares.append(last)
    return shares

# ---------- Pydantic models ----------
class IssueTokenRequest(BaseModel):
    voter_id: str

class SubmitVoteRequest(BaseModel):
    token: str
    voter_id: str
    shares: List[int]      # list length NUM_AUTHORITIES
    commits: List[str]     # list length NUM_AUTHORITIES (commitments)
    proof: str             # placeholder proof; client-side proof that vote is 0/1

# ---------- EA endpoints ----------
@app.post("/ea/issue_token")
async def issue_token(req: IssueTokenRequest):
    # In real deployment, EA authenticates voter (KYC) and then issues a blind signature.
    token = make_token(req.voter_id)
    return {"token": token, "note": "Demo token (not blind-signed). In real system use blind signatures to preserve anonymity."}

# ---------- Voter endpoints ----------
@app.post("/vote/submit")
async def submit_vote(payload: SubmitVoteRequest):
    # 1. verify token
    tokinfo = verify_token(payload.token)
    if tokinfo["voter_id"] != payload.voter_id:
        raise HTTPException(status_code=400, detail="Token does not match voter id")

    # 2. basic validation of shares and commits
    if len(payload.shares) != NUM_AUTHORITIES or len(payload.commits) != NUM_AUTHORITIES:
        raise HTTPException(status_code=400, detail="Wrong number of shares/commits")

    # 3. naive proof verification (DEMO): proof is a hash of concatenation of shares and a '0/1' indicator.
    #    In real setup: non-interactive ZK that the reconstructed vote is in {0,1} without revealing it.
    submitted_proof = payload.proof
    expected_proof = hashlib.sha256(("|".join(map(str,payload.shares))).encode()).hexdigest()
    # NOTE: this check is *NOT* secure — it's only to ensure the client built the proof from the same shares.
    if submitted_proof != expected_proof:
        raise HTTPException(status_code=400, detail="Invalid proof (demo check failed). Replace with real ZK proofs")

    # 4. store shares & commits at each simulated authority
    voter_id = payload.voter_id
    for i, s in enumerate(payload.shares):
        authority_shares[i][voter_id] = s
        authority_commits[i][voter_id] = payload.commits[i]

    # 5. mark token used
    issued_tokens[payload.token]["used"] = True

    # 6. append to bulletin board
    bulletin_board.append({
        "type": "vote_submitted",
        "voter_id": voter_id,
        "token": payload.token,
        "commits": payload.commits,
        "ts": time.time()
    })

    submissions.append({
        "voter_id": voter_id,
        "token": payload.token,
        "shares": payload.shares,
        "commits": payload.commits,
        "proof": payload.proof,
        "ts": time.time()
    })
    return {"status": "ok", "note": "Vote recorded (demo)."}

# ---------- Admin / tally ----------
@app.post("/tally/compute")
async def compute_tally(secret: str = Form(...)):
    """
    Compute local sums at each authority, reconstruct total, and publish aggregated commitment.
    Admin must present a secret to trigger tally (demo auth).
    """
    if secret != "admin-secret-demo":
        raise HTTPException(status_code=401, detail="Unauthorized")

    local_sums = []
    for i in range(NUM_AUTHORITIES):
        s = sum(authority_shares[i].values()) % FIELD
        local_sums.append(s)

    total = sum(local_sums) % FIELD

    # compute aggregated commitment: for our simple hash-commitments we cannot homomorphically combine.
    # For demo we'll store the list of authority commitments and allow clients to verify reconstructing shares.
    agg = {
        "type": "tally_published",
        "local_sums": local_sums,
        "total": total,
        "ts": time.time()
    }
    bulletin_board.append(agg)

    return {"local_sums": local_sums, "total": total, "note": "In production use Pedersen commitments (homomorphic) and publish aggregated commitment proofs."}

# ---------- Public endpoints ----------
@app.get("/bulletin_board")
async def get_bulletin_board():
    return {"board": bulletin_board}

@app.get("/verify/reconstruct")
async def verify_reconstruct():
    """
    Return per-authority sums and allow client to reconstruct total. This is the verification helper.
    """
    local_sums = [sum(authority_shares[i].values()) % FIELD for i in range(NUM_AUTHORITIES)]
    total = sum(local_sums) % FIELD
    return {"local_sums": local_sums, "total": total, "explanation": "You can independently verify by summing local sums (mod FIELD)."}

# ---------- Helper debug endpoint ----------
@app.get("/debug/submissions")
async def debug_submissions():
    return {"submissions": submissions}
