#!/bin/bash
# ==========================================
# HPC Job History Filter
#
# This script reads a CSV file from job_history.sh
# and filters it to keep only "COMPLETED" jobs.
#
# Usage: ./filter_completed.sh <input_file.csv>
# ==========================================

# 1. Check if an input file was provided
if [ -z "$1" ]; then
    echo "Usage: $0 <input_file.csv>"
    echo "Example: $0 job_history_20251115_141113.csv"
    exit 1
fi

INPUT_FILE="$1"

# 2. Check if the input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File not found: $INPUT_FILE"
    exit 1
fi

# 3. Create a new output filename
OUTPUT_FILE="${INPUT_FILE%.csv}_completed.csv"

echo "Filtering $INPUT_FILE for 'COMPLETED' jobs..."

# 4. Use 'awk' to filter the file
#    -F'|' sets the field delimiter to the pipe character
#    NR==1      This condition is true for the first line (the header), so it gets printed.
#    $3=="COMPLETED" This condition is true if the 3rd field is exactly "COMPLETED".
#    {print}    This action prints the line if either condition is true.
awk -F'|' 'NR==1 || $3=="COMPLETED" {print}' "$INPUT_FILE" > "$OUTPUT_FILE"

echo "Done ✅"
echo "Filtered results saved to: $OUTPUT_FILE"