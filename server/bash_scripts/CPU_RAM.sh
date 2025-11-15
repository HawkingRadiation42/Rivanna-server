
#!/usr/bin/env bash
set -euo pipefail

# Requires Slurm CLI (sinfo, scontrol)

# --- Collect raw data ---
SINFO="$(mktemp)"; trap 'rm -f "$SINFO" "$SCONTROL" 2>/dev/null || true' EXIT
SCONTROL="$(mktemp)"

# Per-node: NAME|CPUS(A/I/O/T)|MEM_MB(total)
sinfo -N -h -o "%N|%C|%m" > "$SINFO"

# Full node K=V dump (for FreeMem/AllocMem/RealMemory)
scontrol show node > "$SCONTROL" || true

# --- Process and print ---
awk -F'|' -v SCTRL="$SCONTROL" '
  BEGIN {
    # Read scontrol show node once, build per-node mem maps
    # We parse tokens like Key=Val and capture NodeName, RealMemory, AllocMem, FreeMem
    while ((getline line < SCTRL) > 0) {
      n = split(line, toks, /[ \t]+/)
      for (i=1; i<=n; i++) {
        split(toks[i], kv, "=")
        key = kv[1]; val = kv[2]
        if (key == "NodeName") { cur = val; seen[cur]=1 }
        else if (key == "RealMemory" && cur!="") real[cur] = val + 0
        else if (key == "AllocMem"   && cur!="") alloc[cur] = val + 0
        else if (key == "FreeMem"    && cur!="") freem[cur] = val + 0
      }
    }
    close(SCTRL)
  }
  {
    node = $1
    # CPUs: A/I/O/T
    split($2, c, "/")
    a=c[1]+0; i=c[2]+0; o=c[3]+0; t=c[4]+0
    mem_total = $3 + 0   # from sinfo (%m), fallback if RealMemory missing

    # Totals
    total_cpus += t
    # Prefer RealMemory if we have it; else sinfo %m
    if (node in real) total_mem += real[node]
    else total_mem += mem_total

    # Save idle CPU for ranking
    idle_cpu[node] = i
    total_cpu_per_node[node] = t

    # Available memory per node:
    # Prefer FreeMem; else RealMemory-AllocMem; else unknown (0)
    avail = 0
    if (node in freem)       avail = freem[node]
    else if ((node in real) && (node in alloc)) avail = real[node] - alloc[node]
    else                     avail = 0
    if (avail < 0) avail = 0

    avail_mem[node] = avail
    # Keep RealMemory for display if present; else use sinfo mem
    realmem_disp[node] = (node in real) ? real[node] : mem_total

    nodes[nc++] = node
  }
  END {
    # ---- Output totals ----
    printf "===== CLUSTER TOTALS =====\n"
    printf "Total CPUs       : %d\n", (total_cpus ? total_cpus : 0)
    printf "Total Memory     : %d MB (%.2f GiB)\n\n",
           (total_mem ? total_mem : 0), (total_mem/1024.0)

    # ---- Top 5 by idle CPUs ----
    printf "===== TOP 5 NODES BY IDLE (AVAILABLE) CPUs =====\n"
    # Create sortable list: idle_cpu|node|total_cpu
    for (k in idle_cpu) {
      printf "%010d|%s|%d\n", idle_cpu[k], k, total_cpu_per_node[k] > "/dev/stderr"
    }
  }
' "$SINFO" 2> >(sort -t"|" -k1,1nr | head -5 | awk -F"|" 'BEGIN{print ""} {printf "%-30s  IdleCPUs=%4d  TotalCPUs=%4d\n", $2, $1+0, $3+0; }')

# Second AWK pass for memory top-5 (kept separate to keep sorting simple)
awk -F'|' -v SCTRL="$SCONTROL" '
  BEGIN {
    while ((getline line < SCTRL) > 0) {
      n = split(line, toks, /[ \t]+/)
      for (i=1; i<=n; i++) {
        split(toks[i], kv, "=")
        key = kv[1]; val = kv[2]
        if (key == "NodeName") { cur = val }
        else if (key == "RealMemory" && cur!="") real[cur] = val + 0
        else if (key == "AllocMem"   && cur!="") alloc[cur] = val + 0
        else if (key == "FreeMem"    && cur!="") freem[cur] = val + 0
      }
    }
    close(SCTRL)
  }
  {
    node = $1
    # available mem: prefer FreeMem, else Real-Alloc, else 0
    avail = (node in freem) ? freem[node] : ((node in real && node in alloc) ? (real[node]-alloc[node]) : 0)
    if (avail < 0) avail = 0
    # for display, keep RealMemory if present else sinfo %m
    mem_total = (node in real) ? real[node] : ($3 + 0)
    printf "%012d|%s|%d\n", avail, node, mem_total
  }
' "$SINFO" | sort -t"|" -k1,1nr | head -5 | awk -F"|" '
  BEGIN{
    print ""
    print "===== TOP 5 NODES BY AVAILABLE MEMORY ====="
  }
  {
    availMB=$1+0; node=$2; totalMB=$3+0;
    printf "%-30s  AvailMB=%10d  (%.2f GiB)   TotalMB=%10d (%.2f GiB)\n",
           node, availMB, availMB/1024.0, totalMB, totalMB/1024.0;
  }'

