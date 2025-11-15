import os, asyncio, time, json
from typing import Optional, List, Dict
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv

load_dotenv()

# =========================
# Config
# =========================
HPC_HOST = os.getenv("HPC_HOST")
HPC_USER = os.getenv("HPC_USER")
SSH_KEY_PATH = os.getenv("SSH_KEY_PATH")
POLL_SECONDS = int(os.getenv("POLL_SECONDS", "12"))
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"
MOCK_DATA_DIR = os.getenv("MOCK_DATA_DIR", "./sample_data")

SINFO_CMD  = r'sinfo -o "%P|%N|%T|%C|%m|%G"'
SQUEUE_CMD = r'squeue -o "%i|%P|%j|%u|%t|%M|%D|%R|%C|%m|%b"'

# =========================
# Models
# =========================
class Node(BaseModel):
    partition: str
    name: str
    state: str           # idle|mix|alloc|drain|down|...
    cpusA: int
    cpusI: int
    cpusO: int
    cpusT: int
    mem_mb: int
    gres: Optional[str] = None

class Job(BaseModel):
    id: str
    partition: str
    name: str
    user: str
    state: str           # R|PD|CG|F|...
    runtime: str         # HH:MM:SS or D-HH:MM:SS
    nodes: int
    reason: str
    req_cpus: int
    req_mem: str
    req_gres: Optional[str] = None

# =========================
# Reason explainer (extend anytime)
# =========================
REASON_MAP: Dict[str, Dict] = {
    "Priority": {
        "title": "Waiting on priority",
        "explain": "Your job is queued behind others with higher priority/fairshare.",
        "fixes": [
            "Try a less busy partition",
            "Reduce walltime to enable backfilling",
            "Submit during off-peak hours (night/weekend)"
        ],
    },
    "ReqNodeNotAvail": {
        "title": "Requested node type not available",
        "explain": "Nodes matching your constraints (e.g., GPU model) are busy/reserved.",
        "fixes": [
            "Relax GPU type/constraints if acceptable",
            "Switch to an equivalent partition",
            "Lower requested GPUs or time limit"
        ],
    },
    "Resources": {
        "title": "Insufficient resources",
        "explain": "Cluster cannot currently meet your CPU/MEM/GPU request.",
        "fixes": [
                "Request fewer CPUs/GPUs or less memory",
                "Try a different partition",
                "Shorten the requested time limit"
        ],
    },
    "QOSMaxMemoryPerUser": {
        "title": "QoS memory cap reached",
        "explain": "You've reached the memory allowed by your QoS/user policy.",
        "fixes": [
            "Lower memory request",
            "Split into smaller jobs",
            "Contact support for appropriate QoS"
        ],
    },
    "Licenses": {
        "title": "License availability",
        "explain": "Needed software license is not available at the moment.",
        "fixes": [
            "Run at a different time when licenses free up",
            "Use alternative software if possible"
        ],
    },
}

# =========================
# SSH runner (Paramiko) or Mock
# =========================
def run_ssh(cmd: str) -> str:
    if MOCK_MODE:
        # For mock, load file named by command key
        key = "sinfo" if cmd.startswith("sinfo") else "squeue"
        path = os.path.join(MOCK_DATA_DIR, f"{key}.txt")
        if not os.path.exists(path):
            return ""
        return open(path, "r", encoding="utf-8", errors="ignore").read()

    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        hostname=HPC_HOST,
        username=HPC_USER,
        key_filename=SSH_KEY_PATH,
        timeout=20,
    )
    try:
        _, stdout, stderr = c.exec_command(cmd, timeout=25)
        out = stdout.read().decode(errors="ignore")
        err = stderr.read().decode(errors="ignore")
        return out if out.strip() else err
    finally:
        c.close()

# =========================
# Parsers
# =========================
def parse_cC(field: str):
    # "A/I/O/T" -> ints
    try:
        A, I, O, T = [int(x) for x in field.split("/")]
        return A, I, O, T
    except:
        return 0, 0, 0, 0

def parse_sinfo(text: str) -> List[Node]:
    nodes: List[Node] = []
    for raw in text.strip().splitlines():
        if "|" not in raw:
            continue
        parts = [p.strip() for p in raw.split("|", 5)]
        if len(parts) < 6:
            # Sometimes Slurm compresses multiple nodes; we still try to parse
            parts += [""] * (6 - len(parts))
        P, N, T, C, M, G = parts[:6]
        A, I, O, TT = parse_cC(C)
        try:
            mem_mb = int(M)
        except:
            mem_mb = 0
        # N can be a comma-separated list of nodes; split them
        for name in N.split(","):
            name = name.strip()
            if not name:
                continue
            nodes.append(Node(
                partition=P,
                name=name,
                state=T.lower(),
                cpusA=A, cpusI=I, cpusO=O, cpusT=TT,
                mem_mb=mem_mb,
                gres=None if G in ("(null)", "", "N/A") else G
            ))
    return nodes

def parse_squeue(text: str) -> List[Job]:
    jobs: List[Job] = []
    for raw in text.strip().splitlines():
        if "|" not in raw:
            continue
        parts = [p.strip() for p in raw.split("|", 10)]
        if len(parts) < 11:
            parts += [""] * (11 - len(parts))
        i, P, j, u, t, M, D, R, C, m, b = parts[:11]
        try:
            nodes = int(D)
        except:
            nodes = 1
        try:
            req_cpus = int(C)
        except:
            req_cpus = 0
        jobs.append(Job(
            id=i or "",
            partition=P or "",
            name=j or "",
            user=u or "",
            state=t or "",
            runtime=M or "00:00:00",
            nodes=nodes,
            reason=R or "None",
            req_cpus=req_cpus,
            req_mem=m or "",
            req_gres=None if b in ("N/A","(null)","") else b
        ))
    return jobs

# =========================
# Store + polling
# =========================
STORE = {
    "ts": 0,
    "nodes": [],   # type: List[Dict]
    "jobs": [],    # type: List[Dict]
}

async def poll_loop():
    while True:
        try:
            sinfo_text = run_ssh(SINFO_CMD)
            squeue_text = run_ssh(SQUEUE_CMD)
            nodes = [n.dict() for n in parse_sinfo(sinfo_text)]
            jobs  = [j.dict() for j in parse_squeue(squeue_text)]

            # keep Node CPU sanity: cpusA+cpusI <= cpusT
            for n in nodes:
                if (n["cpusA"] + n["cpusI"]) > n["cpusT"]:
                    n["cpusI"] = max(0, n["cpusT"] - n["cpusA"])

            STORE["nodes"] = nodes
            STORE["jobs"] = jobs
            STORE["ts"] = int(time.time())
        except Exception as e:
            # Don't crash the loop; surface info on endpoints
            print("poll error:", repr(e))
        await asyncio.sleep(POLL_SECONDS)

# =========================
# ETA heuristic (simple & useful)
# =========================
def runtime_to_hours(s: str) -> float:
    # "D-HH:MM:SS" or "HH:MM:SS"
    try:
        if "-" in s:
            d, rest = s.split("-", 1)
            d = int(d)
        else:
            d, rest = 0, s
        hh, mm, ss = [int(x) for x in rest.split(":")]
        return d*24 + hh + mm/60 + ss/3600
    except:
        return 1.0

def eta_for_spec(spec: Dict, snap: Dict) -> Dict:
    part = spec.get("partition")
    # supply: idle CPUs in partition
    idle = 0
    for n in snap["nodes"]:
        if part and n["partition"] != part:
            continue
        idle += n.get("cpusI", 0)

    if idle <= 0:
        idle = 1

    # demand: sum req_cpus for PD jobs in same partition with "Priority"
    demand = 0
    for j in snap["jobs"]:
        if j["partition"] == part and j["state"] == "PD" and "Priority" in j["reason"]:
            demand += j.get("req_cpus", 0)

    # average runtime in that partition
    rts = [runtime_to_hours(j["runtime"]) for j in snap["jobs"] if j["partition"] == part and j["state"] == "R"]
    avg_rt = max(sum(rts)/len(rts), 0.5) if rts else 2.0

    base = demand / idle
    eta_hours = base * avg_rt
    lo = int(max(5, eta_hours * 30))  # mins (lower band)
    hi = int(max(10, eta_hours * 60)) # mins (upper band)
    conf = "low" if base > 2 else ("med" if base > 0.5 else "high")
    return {
        "spec": spec,
        "eta_minutes_low": lo,
        "eta_minutes_high": hi,
        "confidence": conf,
        "rationale": "Heuristic using current idle CPUs vs queued demand in partition"
    }

# =========================
# FastAPI
# =========================
app = FastAPI(title="ClusterMap Data API")

@app.on_event("startup")
async def on_start():
    asyncio.create_task(poll_loop())

@app.get("/nodes")
def get_nodes():
    if not STORE["nodes"]:
        raise HTTPException(503, "No data yet; polling HPC.")
    return {"generated_at": STORE["ts"], "nodes": STORE["nodes"]}

@app.get("/jobs")
def get_jobs():
    if not STORE["jobs"]:
        raise HTTPException(503, "No data yet; polling HPC.")
    return {"generated_at": STORE["ts"], "jobs": STORE["jobs"]}

@app.get("/reasons")
def get_reasons():
    return REASON_MAP

@app.post("/eta")
def post_eta(spec: Dict):
    # spec example: {"partition":"gpu-a40","gpus":1,"cpus":8,"mem_gb":32,"time_limit":"4:00:00"}
    if not STORE["nodes"]:
        raise HTTPException(503, "No data yet; polling HPC.")
    return eta_for_spec(spec, STORE)
