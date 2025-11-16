#!/bin/bash
# ==========================================
# HPC Job History Collector
# ==========================================

# --- Configuration ---
SEARCH_PERIOD="30 days ago"
OUTFILE="job_history_$(date +%Y%m%d_%H%M%S).csv"

# --- Main Script ---
# This function will show a spinner and elapsed time
show_progress() {
    local pid=$1
    local start_time=$SECONDS
    local spinstr='|/-\'
    
    while kill -0 $pid 2>/dev/null; do
        local temp=${spinstr#?}
        local spinchar="$spinstr"
        spinstr=$temp${spinchar%"$temp"}
        
        local elapsed=$((SECONDS - start_time))
        
        # Print spinner and time, using \r to overwrite the line
        printf "\rCollecting historical job data... %c (Elapsed: %ss) " "$spinchar" "$elapsed"
        sleep 0.1
    done
    
    # After sacct finishes, print the final "Done" message
    local final_elapsed=$((SECONDS - start_time))
    
    # Clear the entire progress line
    printf "\r%*s\r" "$(tput cols)" ""
    echo "Done. (Total time: ${final_elapsed}s)"
}

# Run sacct in the background so we can show progress
sacct -a -S $(date -d "$SEARCH_PERIOD" +%Y-%m-%d) \
      -o Submit,Start,State,AllocCPUS,ReqMem,AllocTRES,Partition -P > "$OUTFILE" &

# Get the Process ID of the sacct command
SACCT_PID=$!

# Show the progress
# This function's loop will block execution until sacct is done
show_progress $SACCT_PID

# Wait for the sacct command to fully complete (ensures exit code is captured)
wait $SACCT_PID

echo "Saved results to: $OUTFILE"
