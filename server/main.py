import os
import paramiko
from openai import OpenAI
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from model import JobWaitDurationPredictor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables (override existing ones)
load_dotenv(override=True)

# Configure OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Global SSH client
ssh_client = None

# Initialize wait time predictor
wait_time_predictor = None
try:
    model_path = os.path.join(os.path.dirname(__file__), "random_forest_model.pkl")
    wait_time_predictor = JobWaitDurationPredictor(model_path)
    logger.info("Wait time predictor initialized successfully")
except Exception as e:
    logger.warning(f"Failed to initialize wait time predictor: {e}")
    logger.warning("Wait time estimation will not be available")


# Pydantic models for optimization endpoint
class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None


class OptimizationRequest(BaseModel):
    user_message: str
    conversation_history: Optional[List[ChatMessage]] = None


class OptimizationRecommendation(BaseModel):
    partition: str
    gpu_type: Optional[str] = None
    gpu_count: Optional[int] = None
    cpu_count: int
    memory_gb: int
    time_limit: str
    reasoning: str


class OptimizationResponse(BaseModel):
    success: bool
    natural_language: str
    recommendation: Optional[OptimizationRecommendation] = None
    error: Optional[str] = None


class WaitTimeRequest(BaseModel):
    cpu_count: int
    memory_gb: int
    gpu_count: int
    partition: str


class WaitTimeResponse(BaseModel):
    success: bool
    estimated_wait_hours: Optional[float] = None
    partition: str
    error: Optional[str] = None


class SSHConnectionManager:
    """Manages persistent SSH connection to HPC cluster"""

    def __init__(self):
        self.client = None
        self.host = os.getenv("HPC_HOST")
        self.user = os.getenv("HPC_USER")
        self.key_path = os.getenv("SSH_KEY_PATH")

    def connect(self):
        """Establish SSH connection with keep-alive"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            # Load private key
            private_key = paramiko.RSAKey.from_private_key_file(self.key_path)

            # Connect to HPC with extended timeouts
            logger.info(f"Connecting to {self.user}@{self.host}")
            self.client.connect(
                hostname=self.host,
                username=self.user,
                pkey=private_key,
                timeout=30,
                banner_timeout=60,  # Wait up to 60 seconds for SSH banner
                auth_timeout=30,    # Authentication timeout
                look_for_keys=False,  # Don't search for other keys
                allow_agent=False   # Don't use SSH agent
            )

            # Enable keep-alive to maintain connection
            transport = self.client.get_transport()
            transport.set_keepalive(30)  # Send keep-alive packet every 30 seconds

            logger.info("SSH connection established successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to establish SSH connection: {e}")
            raise

    def execute_command(self, command: str):
        """Execute command over SSH connection"""
        try:
            if not self.client or not self.client.get_transport() or not self.client.get_transport().is_active():
                logger.warning("SSH connection lost, reconnecting...")
                self.connect()

            logger.info(f"Executing command: {command}")
            stdin, stdout, stderr = self.client.exec_command(command)

            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')
            exit_status = stdout.channel.recv_exit_status()

            if exit_status != 0 and error:
                logger.error(f"Command failed with error: {error}")
                return {"success": False, "error": error, "exit_status": exit_status}

            return {"success": True, "output": output, "exit_status": exit_status}

        except Exception as e:
            logger.error(f"Error executing command: {e}")
            raise

    def close(self):
        """Close SSH connection"""
        if self.client:
            logger.info("Closing SSH connection")
            self.client.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage SSH connection lifecycle"""
    global ssh_client

    # Startup: establish SSH connection
    logger.info("Starting up FastAPI server...")
    ssh_client = SSHConnectionManager()
    ssh_client.connect()

    yield

    # Shutdown: close SSH connection
    logger.info("Shutting down FastAPI server...")
    ssh_client.close()


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="HPC Job Monitor API",
    description="FastAPI backend for monitoring HPC jobs via persistent SSH connection",
    version="1.0.0",
    lifespan=lifespan
)

# Create alias for uvicorn main:main --reload
main = app


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "HPC Job Monitor API is running",
        "ssh_connected": ssh_client.client.get_transport().is_active() if ssh_client and ssh_client.client else False
    }


@app.get("/jobs")
async def get_jobs():
    """Get current user's jobs using squeue command"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        # Execute squeue command
        command = f"squeue --user {os.getenv('HPC_USER')}"
        result = ssh_client.execute_command(command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        # Parse the output
        output = result["output"]
        lines = output.strip().split('\n')

        if len(lines) == 0:
            return {"jobs": [], "raw_output": output}

        # Parse header and job entries
        jobs = []
        if len(lines) > 1:
            for line in lines[1:]:  # Skip header
                if line.strip():
                    jobs.append(line)

        return {
            "success": True,
            "job_count": len(jobs),
            "jobs": jobs,
            "raw_output": output
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /jobs endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cpu")
async def get_cpu_stats():
    """Get CPU and memory statistics from HPC cluster"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        # Read the bash script
        script_path = os.path.join(os.path.dirname(__file__), "bash_scripts", "CPU_RAM.sh")

        with open(script_path, 'r') as f:
            script_content = f.read()

        # Execute the script via SSH
        # We'll use bash -s to pipe the script content
        command = f"bash -s << 'EOFSCRIPT'\n{script_content}\nEOFSCRIPT"
        result = ssh_client.execute_command(command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        # Parse the output
        output = result["output"]

        # Initialize data structure
        cluster_totals = {}
        top_cpu_nodes = []
        top_memory_nodes = []

        # Split output into lines
        lines = output.strip().split('\n')

        current_section = None
        for line in lines:
            line = line.strip()

            if not line:
                continue

            # Detect sections
            if "===== CLUSTER TOTALS =====" in line:
                current_section = "totals"
                continue
            elif "===== TOP 5 NODES BY IDLE (AVAILABLE) CPUs =====" in line:
                current_section = "cpu"
                continue
            elif "===== TOP 5 NODES BY AVAILABLE MEMORY =====" in line:
                current_section = "memory"
                continue

            # Parse based on current section
            if current_section == "totals":
                if "Total CPUs" in line:
                    # Extract: "Total CPUs       : 12345"
                    parts = line.split(':')
                    if len(parts) == 2:
                        try:
                            cluster_totals["total_cpus"] = int(parts[1].strip())
                        except ValueError:
                            logger.warning(f"Could not parse total CPUs from: {line}")
                elif "Allocated CPUs" in line:
                    # Extract: "Allocated CPUs   : 12345"
                    parts = line.split(':')
                    if len(parts) == 2:
                        try:
                            cluster_totals["allocated_cpus"] = int(parts[1].strip())
                        except ValueError:
                            logger.warning(f"Could not parse allocated CPUs from: {line}")
                elif "Idle CPUs" in line:
                    # Extract: "Idle CPUs        : 12345"
                    parts = line.split(':')
                    if len(parts) == 2:
                        try:
                            cluster_totals["idle_cpus"] = int(parts[1].strip())
                        except ValueError:
                            logger.warning(f"Could not parse idle CPUs from: {line}")
                elif "Other CPUs" in line:
                    # Extract: "Other CPUs       : 12345"
                    parts = line.split(':')
                    if len(parts) == 2:
                        try:
                            cluster_totals["other_cpus"] = int(parts[1].strip())
                        except ValueError:
                            logger.warning(f"Could not parse other CPUs from: {line}")
                elif "Total Memory" in line:
                    # Extract: "Total Memory     : 123456 MB (123.45 GiB)"
                    parts = line.split(':')
                    if len(parts) == 2:
                        mem_parts = parts[1].strip().split()
                        if len(mem_parts) >= 2:
                            try:
                                cluster_totals["total_memory_mb"] = int(mem_parts[0])
                                # Extract GiB value from "(123.45 GiB)"
                                if len(mem_parts) >= 4:
                                    gib_str = mem_parts[2].replace('(', '')
                                    cluster_totals["total_memory_gib"] = float(gib_str)
                            except ValueError:
                                logger.warning(f"Could not parse total memory from: {line}")

            elif current_section == "cpu":
                # Parse lines like: "node-name                      IdleCPUs=  12  TotalCPUs=  24"
                if "IdleCPUs=" in line:
                    try:
                        parts = line.split()
                        node_name = parts[0]
                        idle_cpus = 0
                        total_cpus = 0

                        for i, part in enumerate(parts):
                            if "IdleCPUs=" in part:
                                # Value is in the next element
                                if i + 1 < len(parts):
                                    idle_cpus = int(parts[i + 1])
                            elif "TotalCPUs=" in part:
                                # Value is in the next element
                                if i + 1 < len(parts):
                                    total_cpus = int(parts[i + 1])

                        # Only add if we have valid data
                        if node_name and total_cpus > 0:
                            top_cpu_nodes.append({
                                "node_name": node_name,
                                "idle_cpus": idle_cpus,
                                "total_cpus": total_cpus,
                                "usage_percent": round(((total_cpus - idle_cpus) / total_cpus * 100) if total_cpus > 0 else 0, 2)
                            })
                    except (ValueError, IndexError) as e:
                        logger.warning(f"Could not parse CPU line: {line}, error: {e}")

            elif current_section == "memory":
                # Parse lines like: "node-name                      AvailMB=     12345  (12.34 GiB)   TotalMB=     56789 (56.78 GiB)"
                if "AvailMB=" in line:
                    try:
                        parts = line.split()
                        node_name = parts[0]
                        avail_mb = 0
                        avail_gib = 0.0
                        total_mb = 0
                        total_gib = 0.0

                        for i, part in enumerate(parts):
                            if "AvailMB=" in part:
                                # Value is in the next element
                                if i + 1 < len(parts):
                                    avail_mb = int(parts[i + 1])
                                # GiB value is in i+2, formatted as "(1990.75"
                                if i + 2 < len(parts):
                                    gib_val = parts[i + 2].replace('(', '').strip()
                                    if gib_val:
                                        avail_gib = float(gib_val)
                            elif "TotalMB=" in part:
                                # Value is in the next element
                                if i + 1 < len(parts):
                                    total_mb = int(parts[i + 1])
                                # GiB value is in i+2, formatted as "(1953.12"
                                if i + 2 < len(parts):
                                    gib_val = parts[i + 2].replace('(', '').strip()
                                    if gib_val:
                                        total_gib = float(gib_val)

                        # Only add if we have valid data
                        if node_name and total_mb > 0:
                            top_memory_nodes.append({
                                "node_name": node_name,
                                "available_memory_mb": avail_mb,
                                "available_memory_gib": avail_gib,
                                "total_memory_mb": total_mb,
                                "total_memory_gib": total_gib,
                                "usage_percent": round(((total_mb - avail_mb) / total_mb * 100) if total_mb > 0 else 0, 2)
                            })
                    except (ValueError, IndexError) as e:
                        logger.warning(f"Could not parse memory line: {line}, error: {e}")

        return {
            "success": True,
            "cluster_totals": cluster_totals,
            "top_cpu_nodes": top_cpu_nodes,
            "top_memory_nodes": top_memory_nodes,
            "raw_output": output
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /cpu endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gpu")
async def get_gpu_stats():
    """Get GPU statistics from HPC cluster"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        # Build the GPU stats command
        gpu_command = """
INC_MIG=0; awk -v INC_MIG="$INC_MIG" '
FNR==NR{
  node=$1; type=$2; cnt=$3;
  if(!INC_MIG && type ~ /\\./) next;
  ntype[node]=type; ncnt[node]=cnt; tot[type]+=cnt; seen[type]=1; next
}
{
  node=$1; used=$2+0; type=ntype[node];
  if(type=="") next;
  if(!INC_MIG && type ~ /\\./) next;
  if(used>ncnt[node]) used=ncnt[node];
  use[type]+=used; seen[type]=1
}
END{
  printf "%-12s %10s %10s %10s\\n","TYPE","TOTAL","IN_USE","FREE";
  for(t in seen) printf "%-12s %10d %10d %10d\\n", t, tot[t]+0, use[t]+0, (tot[t]+0)-(use[t]+0)
}
' \\
<(sinfo -N -h -o "%N %G" | awk '{
  node=$1; $1=""; gres=substr($0,2); gsub(/\\([^)]*\\)/,"",gres);
  if(match(gres,/gpu:[^, ]+/,m)){
    tok=m[0];
    if(match(tok,/^gpu:([^:]+):([0-9]+)/,mm)){type=mm[1]; cnt=mm[2]}
    else if(match(tok,/^gpu:([0-9]+)/,mm2)){type="untyped"; cnt=mm2[1]}
    else next;
    print node, type, cnt
  }
}') \\
<(scontrol -o show nodes | awk '{
  split($1,a,"="); node=a[2];
  used=0;
  # Try typed GPU allocation first (gres/gpu:TYPE=N)
  if(match($0,/gres\\/gpu:[^=]+=[0-9]+/)){
    split($0,parts,",");
    for(i in parts){
      if(match(parts[i],/gres\\/gpu:[^=]+=([0-9]+)/,m)) used+=m[1];
    }
  }
  # Otherwise use generic count
  else if(match($0,/AllocTRES=[^ ]*gres\\/gpu=([0-9]+)/,m)) used=m[1];
  print node, used
}')
"""

        # Execute the command via SSH
        result = ssh_client.execute_command(gpu_command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        # Parse the output
        output = result["output"]
        lines = output.strip().split('\n')

        gpu_stats = []

        # Process each line
        for line in lines:
            line = line.strip()
            if not line or line.startswith("TYPE"):  # Skip empty lines and header
                continue

            try:
                # Parse line format: "TYPE         TOTAL     IN_USE       FREE"
                parts = line.split()
                if len(parts) >= 4:
                    gpu_type = parts[0]
                    total = int(parts[1])
                    in_use = int(parts[2])
                    free = int(parts[3])

                    # Calculate utilization percentage
                    utilization = round((in_use / total * 100) if total > 0 else 0, 2)

                    gpu_stats.append({
                        "type": gpu_type,
                        "total": total,
                        "in_use": in_use,
                        "free": free,
                        "utilization_percent": utilization
                    })
            except (ValueError, IndexError) as e:
                logger.warning(f"Could not parse GPU line: {line}, error: {e}")
                continue

        # Calculate overall GPU statistics
        total_gpus = sum(stat["total"] for stat in gpu_stats)
        total_in_use = sum(stat["in_use"] for stat in gpu_stats)
        total_free = sum(stat["free"] for stat in gpu_stats)
        overall_utilization = round((total_in_use / total_gpus * 100) if total_gpus > 0 else 0, 2)

        return {
            "success": True,
            "overall": {
                "total_gpus": total_gpus,
                "gpus_in_use": total_in_use,
                "gpus_free": total_free,
                "utilization_percent": overall_utilization
            },
            "gpu_types": gpu_stats,
            "raw_output": output
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /gpu endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def parse_squeue_output(output: str):
    """Helper function to parse squeue output into structured format"""
    lines = output.strip().split('\n')

    if len(lines) == 0:
        return []

    jobs = []
    # Skip the header line and parse job entries
    for line in lines[1:] if len(lines) > 1 else lines:
        if line.strip():
            # Parse the fixed-width columns
            parts = line.split()
            if len(parts) >= 7:
                try:
                    jobs.append({
                        "job_id": parts[0].strip(),
                        "user": parts[1].strip(),
                        "name": parts[2].strip(),
                        "state": parts[3].strip(),
                        "time_used": parts[4].strip(),
                        "time_limit": parts[5].strip(),
                        "tres_per_node": parts[6].strip() if len(parts) > 6 else "",
                        "nodelist": parts[7].strip() if len(parts) > 7 else ""
                    })
                except (ValueError, IndexError) as e:
                    logger.warning(f"Could not parse job line: {line}, error: {e}")
                    continue

    return jobs


@app.get("/gpu/h200")
async def get_h200_queue():
    """Get H200 GPU queue using squeue command"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        command = "squeue -p gpu-h200 -O jobid:10,UserName:10,name:30,state:10,timeused:10,TimeLimit:12,tres-per-node,nodelist"
        result = ssh_client.execute_command(command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        output = result["output"]
        jobs = parse_squeue_output(output)

        return {
            "success": True,
            "gpu_type": "H200",
            "partition": "gpu-h200",
            "job_count": len(jobs),
            "jobs": jobs,
            "raw_output": output
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /gpu/h200 endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gpu/a6000")
async def get_a6000_queue():
    """Get A6000 GPU queue using squeue command"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        command = "squeue -p gpu-a6000 -O jobid:10,UserName:10,name:30,state:10,timeused:10,TimeLimit:12,tres-per-node,nodelist"
        result = ssh_client.execute_command(command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        output = result["output"]
        jobs = parse_squeue_output(output)

        return {
            "success": True,
            "gpu_type": "A6000",
            "partition": "gpu-a6000",
            "job_count": len(jobs),
            "jobs": jobs,
            "raw_output": output
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /gpu/a6000 endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gpu/a40")
async def get_a40_queue():
    """Get A40 GPU queue using squeue command"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        command = "squeue -p gpu-a40 -O jobid:10,UserName:10,name:30,state:10,timeused:10,TimeLimit:12,tres-per-node,nodelist"
        result = ssh_client.execute_command(command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        output = result["output"]
        jobs = parse_squeue_output(output)

        return {
            "success": True,
            "gpu_type": "A40",
            "partition": "gpu-a40",
            "job_count": len(jobs),
            "jobs": jobs,
            "raw_output": output
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /gpu/a40 endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gpu/v100")
async def get_v100_queue():
    """Get V100 GPU queue using squeue command"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        command = "squeue -p gpu-v100 -O jobid:10,UserName:10,name:30,state:10,timeused:10,TimeLimit:12,tres-per-node,nodelist"
        result = ssh_client.execute_command(command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        output = result["output"]
        jobs = parse_squeue_output(output)

        return {
            "success": True,
            "gpu_type": "V100",
            "partition": "gpu-v100",
            "job_count": len(jobs),
            "jobs": jobs,
            "raw_output": output
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /gpu/v100 endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gpu/a100")
async def get_a100_queue():
    """Get A100 GPU queue (combines both 80GB and 40GB partitions)"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        # Query both A100 partitions
        command_80 = "squeue -p gpu-a100-80 -O jobid:10,UserName:10,name:30,state:10,timeused:10,TimeLimit:12,tres-per-node,nodelist"
        command_40 = "squeue -p gpu-a100-40 -O jobid:10,UserName:10,name:30,state:10,timeused:10,TimeLimit:12,tres-per-node,nodelist"

        # Execute both commands
        result_80 = ssh_client.execute_command(command_80)
        result_40 = ssh_client.execute_command(command_40)

        if not result_80["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"A100-80 command execution failed: {result_80.get('error', 'Unknown error')}"
            )

        if not result_40["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"A100-40 command execution failed: {result_40.get('error', 'Unknown error')}"
            )

        # Parse outputs
        jobs_80 = parse_squeue_output(result_80["output"])
        jobs_40 = parse_squeue_output(result_40["output"])

        # Mark each job with its partition
        for job in jobs_80:
            job["partition"] = "gpu-a100-80"
        for job in jobs_40:
            job["partition"] = "gpu-a100-40"

        # Combine both lists
        all_jobs = jobs_80 + jobs_40

        return {
            "success": True,
            "gpu_type": "A100",
            "partitions": ["gpu-a100-80", "gpu-a100-40"],
            "job_count": len(all_jobs),
            "job_count_80gb": len(jobs_80),
            "job_count_40gb": len(jobs_40),
            "jobs": all_jobs,
            "raw_output_80gb": result_80["output"],
            "raw_output_40gb": result_40["output"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /gpu/a100 endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gpu/3090")
async def get_3090_queue():
    """Get RTX 3090 GPU queue using squeue command"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        command = "squeue -p gpu-rtx3090 -O jobid:10,UserName:10,name:30,state:10,timeused:10,TimeLimit:12,tres-per-node,nodelist"
        result = ssh_client.execute_command(command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        output = result["output"]
        jobs = parse_squeue_output(output)

        return {
            "success": True,
            "gpu_type": "RTX 3090",
            "partition": "gpu-rtx3090",
            "job_count": len(jobs),
            "jobs": jobs,
            "raw_output": output
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /gpu/3090 endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gpu/2080ti")
async def get_2080ti_queue():
    """Get RTX 2080Ti GPU queue using squeue command"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        command = "squeue -p gpu-rtx2080 -O jobid:10,UserName:10,name:30,state:10,timeused:10,TimeLimit:12,tres-per-node,nodelist"
        result = ssh_client.execute_command(command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        output = result["output"]
        jobs = parse_squeue_output(output)

        return {
            "success": True,
            "gpu_type": "RTX 2080Ti",
            "partition": "gpu-rtx2080",
            "job_count": len(jobs),
            "jobs": jobs,
            "raw_output": output
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /gpu/2080ti endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimize")
async def optimize_job(request: OptimizationRequest):
    """Optimize job configuration using GPT-4 and real-time cluster data"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        logger.info(f"Optimization request: {request.user_message}")

        # Fetch real-time cluster data by calling existing endpoints
        try:
            # Call internal GPU endpoint
            gpu_response = await get_gpu_stats()
            gpu_info = {}

            if gpu_response and "gpu_types" in gpu_response:
                for gpu_type_data in gpu_response["gpu_types"]:
                    gpu_info[gpu_type_data["type"]] = {
                        "total": gpu_type_data["total"],
                        "in_use": gpu_type_data["in_use"],
                        "free": gpu_type_data["free"],
                        "utilization": gpu_type_data["utilization_percent"]
                    }

            # Call internal CPU endpoint
            cpu_response = await get_cpu_stats()
            cpu_info = {"total_cpus": 0, "allocated_cpus": 0, "idle_cpus": 0}

            if cpu_response and "cluster_totals" in cpu_response:
                totals = cpu_response["cluster_totals"]
                cpu_info = {
                    "total_cpus": totals.get("total_cpus", 0),
                    "allocated_cpus": totals.get("allocated_cpus", 0),
                    "idle_cpus": totals.get("idle_cpus", 0)
                }

        except Exception as e:
            logger.warning(f"Failed to fetch cluster data: {e}")
            gpu_info = {}
            cpu_info = {"total_cpus": 0, "allocated_cpus": 0, "idle_cpus": 0}

        # Build context for GPT
        gpu_context = "\n".join([
            f"- {gpu_type}: {data['free']} free out of {data['total']} total ({data['utilization']}% utilized)"
            for gpu_type, data in gpu_info.items()
        ]) if gpu_info else "GPU information unavailable"

        cpu_context = f"Total CPUs: {cpu_info['total_cpus']}, Allocated: {cpu_info['allocated_cpus']}, Idle: {cpu_info['idle_cpus']}"

        # Build conversation history for context
        conversation_context = ""
        if request.conversation_history:
            conversation_context = "\n".join([
                f"{msg.role}: {msg.content}" for msg in request.conversation_history[-5:]  # Last 5 messages
            ])

        # System prompt for GPT
        system_prompt = f"""You are an expert HPC (High-Performance Computing) cluster optimization assistant for a SLURM-managed cluster.

Current Cluster Status:
GPU Availability:
{gpu_context}

CPU Status:
{cpu_context}

Your task is to analyze user job requirements and provide:
1. Natural language explanation of recommendations
2. Structured JSON configuration

Available GPU partitions:
- gpu-h200 (H200 GPUs)
- gpu-a6000 (A6000 GPUs)
- gpu-a40 (A40 GPUs)
- gpu-v100 (V100 GPUs)
- gpu-a100-80 (A100 80GB)
- gpu-a100-40 (A100 40GB)
- gpu-rtx3090 (RTX 3090)
- gpu-rtx2080 (RTX 2080Ti)

When responding:
1. First provide a natural language explanation (2-3 sentences)
2. Then provide a JSON block with this exact structure:
```json
{{
  "partition": "recommended-partition-name",
  "gpu_type": "GPU-type-name",
  "gpu_count": number,
  "cpu_count": number,
  "memory_gb": number,
  "time_limit": "HH:MM:SS",
  "reasoning": "Brief explanation of why this configuration"
}}
```

Base recommendations on:
- Current GPU availability (prefer GPUs with higher free count)
- User's stated requirements
- Typical use cases for different GPU types
- Resource efficiency"""

        # Call OpenAI GPT-5-mini (using 1.0+ syntax)
        try:
            response = openai_client.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.user_message}
                ],
            )

            gpt_response = response.choices[0].message.content
            logger.info(f"GPT Response: {gpt_response}")

            # Parse the response to extract JSON
            natural_language = gpt_response
            recommendation = None

            # Try to extract JSON from response
            try:
                # Find JSON block in response
                json_start = gpt_response.find('```json')
                json_end = gpt_response.find('```', json_start + 7)

                if json_start != -1 and json_end != -1:
                    json_str = gpt_response[json_start + 7:json_end].strip()
                    recommendation_data = json.loads(json_str)

                    recommendation = OptimizationRecommendation(**recommendation_data)

                    # Extract natural language (text before JSON)
                    natural_language = gpt_response[:json_start].strip()
                else:
                    # Try to find JSON object without code blocks
                    import re
                    json_match = re.search(r'\{[^}]+\}', gpt_response, re.DOTALL)
                    if json_match:
                        recommendation_data = json.loads(json_match.group())
                        recommendation = OptimizationRecommendation(**recommendation_data)
                        natural_language = gpt_response[:json_match.start()].strip()

            except Exception as parse_error:
                logger.warning(f"Failed to parse JSON from GPT response: {parse_error}")
                # Return just natural language if JSON parsing fails
                pass

            return OptimizationResponse(
                success=True,
                natural_language=natural_language if natural_language else gpt_response,
                recommendation=recommendation
            )

        except Exception as openai_error:
            logger.error(f"OpenAI API error: {openai_error}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get optimization from AI: {str(openai_error)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /optimize endpoint: {e}")
        return OptimizationResponse(
            success=False,
            natural_language="Sorry, I encountered an error while processing your request.",
            error=str(e)
        )


@app.post("/predict-wait-time")
async def predict_wait_time(request: WaitTimeRequest):
    """Predict job wait time using the machine learning model"""
    try:
        if not wait_time_predictor:
            raise HTTPException(
                status_code=503,
                detail="Wait time predictor not initialized. Please ensure random_forest_model.pkl exists in the server directory."
            )

        logger.info(f"Wait time prediction request: CPUs={request.cpu_count}, Memory={request.memory_gb}GB, GPUs={request.gpu_count}, Partition={request.partition}")

        # Call the predictor
        estimated_wait_seconds = wait_time_predictor.predict_wait_duration(
            alloc_cpus=request.cpu_count,
            req_mem_gb=request.memory_gb,
            gpu_count=request.gpu_count,
            partition=request.partition
        )

        # Convert seconds to hours
        estimated_wait_hours = round(estimated_wait_seconds / 3600, 2)

        logger.info(f"Predicted wait time: {estimated_wait_hours} hours ({estimated_wait_seconds} seconds)")

        return WaitTimeResponse(
            success=True,
            estimated_wait_hours=estimated_wait_hours,
            partition=request.partition
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /predict-wait-time endpoint: {e}")
        return WaitTimeResponse(
            success=False,
            partition=request.partition,
            error=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
