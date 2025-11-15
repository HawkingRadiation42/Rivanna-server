# HPC Job Monitor API Documentation

**Base URL:** `http://localhost:8000`

---

## Endpoints

### 1. Health Check
**`GET /`**

Response:
```json
{
  "status": "running",
  "message": "HPC Job Monitor API is running",
  "ssh_connected": true
}
```

---

### 2. User Jobs
**`GET /jobs`**

Get all jobs for the authenticated user.

Response:
```json
{
  "success": true,
  "job_count": 2,
  "jobs": ["12345 gpu job-name user123 R 1:23:45 1 node001", ...],
  "raw_output": "..."
}
```

---

### 3. CPU & Memory Stats
**`GET /cpu`**

Response:
```json
{
  "success": true,
  "cluster_totals": {
    "total_cpus": 42152,
    "total_memory_mb": 408120000,
    "total_memory_gib": 398554.69
  },
  "top_cpu_nodes": [
    {
      "node_name": "udc-an37-1",
      "idle_cpus": 126,
      "total_cpus": 128,
      "usage_percent": 1.56
    }
  ],
  "top_memory_nodes": [
    {
      "node_name": "udc-an37-19",
      "available_memory_mb": 2038526,
      "available_memory_gib": 1990.75,
      "total_memory_mb": 2000000,
      "total_memory_gib": 1953.12,
      "usage_percent": -1.93
    }
  ],
  "raw_output": "..."
}
```

---

### 4. GPU Overall Stats
**`GET /gpu`**

Response:
```json
{
  "success": true,
  "overall": {
    "total_gpus": 450,
    "gpus_in_use": 312,
    "gpus_free": 138,
    "utilization_percent": 69.33
  },
  "gpu_types": [
    {
      "type": "a100",
      "total": 120,
      "in_use": 85,
      "free": 35,
      "utilization_percent": 70.83
    }
  ],
  "raw_output": "..."
}
```

---

### 5. GPU Queue Endpoints

All GPU queue endpoints return job details for specific partitions.

| Endpoint | GPU Type | Partition(s) |
|----------|----------|--------------|
| `GET /gpu/h200` | H200 | gpu-h200 |
| `GET /gpu/a6000` | A6000 | gpu-a6000 |
| `GET /gpu/a40` | A40 | gpu-a40 |
| `GET /gpu/v100` | V100 | gpu-v100 |
| `GET /gpu/a100` | A100 | gpu-a100-80, gpu-a100-40 |
| `GET /gpu/3090` | RTX 3090 | gpu-rtx3090 |
| `GET /gpu/2080ti` | RTX 2080Ti | gpu-rtx2080 |

#### Standard Response (H200, A6000, A40, V100, 3090, 2080Ti):
```json
{
  "success": true,
  "gpu_type": "H200",
  "partition": "gpu-h200",
  "job_count": 3,
  "jobs": [
    {
      "job_id": "12345",
      "user": "user123",
      "name": "training-job",
      "state": "R",
      "time_used": "1:23:45",
      "time_limit": "24:00:00",
      "tres_per_node": "gpu:h200:2",
      "nodelist": "node-gpu-001"
    }
  ],
  "raw_output": "..."
}
```

#### A100 Response (combines 80GB + 40GB partitions):
```json
{
  "success": true,
  "gpu_type": "A100",
  "partitions": ["gpu-a100-80", "gpu-a100-40"],
  "job_count": 5,
  "job_count_80gb": 3,
  "job_count_40gb": 2,
  "jobs": [
    {
      "job_id": "12345",
      "user": "user123",
      "name": "training-job",
      "state": "R",
      "time_used": "1:23:45",
      "time_limit": "24:00:00",
      "tres_per_node": "gpu:a100_80gb:4",
      "nodelist": "node-gpu-001",
      "partition": "gpu-a100-80"
    }
  ],
  "raw_output_80gb": "...",
  "raw_output_40gb": "..."
}
```

---

## Job States
- `R` - Running
- `PD` - Pending
- `CG` - Completing
- `CD` - Completed
- `F` - Failed
- `CA` - Cancelled
- `TO` - Timeout

---

## Error Response
```json
{
  "detail": "SSH connection not initialized"
}
```

or

```json
{
  "detail": "Command execution failed: <error message>"
}
```

---

## Quick Start (JavaScript)

```javascript
// Health check
const health = await fetch('http://localhost:8000/').then(r => r.json());

// Get GPU stats
const gpuStats = await fetch('http://localhost:8000/gpu').then(r => r.json());

// Get H200 queue
const h200Queue = await fetch('http://localhost:8000/gpu/h200').then(r => r.json());

// Get CPU stats
const cpuStats = await fetch('http://localhost:8000/cpu').then(r => r.json());

// Get user jobs
const jobs = await fetch('http://localhost:8000/jobs').then(r => r.json());
```

**Note:** Recommended polling interval: 30-60 seconds to avoid overwhelming the HPC cluster.
