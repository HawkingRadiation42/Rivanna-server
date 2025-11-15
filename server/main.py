import os
import paramiko
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Global SSH client
ssh_client = None


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

            # Connect to HPC
            logger.info(f"Connecting to {self.user}@{self.host}")
            self.client.connect(
                hostname=self.host,
                username=self.user,
                pkey=private_key,
                timeout=30
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


@app.get("/jobs/raw")
async def get_jobs_raw():
    """Get raw squeue output"""
    try:
        if not ssh_client:
            raise HTTPException(status_code=500, detail="SSH connection not initialized")

        command = f"squeue --user {os.getenv('HPC_USER')}"
        result = ssh_client.execute_command(command)

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Command execution failed: {result.get('error', 'Unknown error')}"
            )

        return {
            "success": True,
            "output": result["output"],
            "exit_status": result["exit_status"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /jobs/raw endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
