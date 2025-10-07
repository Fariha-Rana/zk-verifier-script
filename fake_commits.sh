#!/bin/bash

# Make sure you’re in a Git repo
if [ ! -d .git ]; then
  echo "❌ This is not a git repository."
  exit 1
fi

# Start date (20 days ago)
start_date=$(date -d "20 days ago" +%Y-%m-%d)

# Loop through 20 days
for i in {0..19}
do
  commit_date=$(date -d "$start_date + $i day" +"%Y-%m-%dT12:00:00")
  echo "Commit for $commit_date" >> fake_log.txt
  
  git add fake_log.txt
  GIT_COMMIT_DATE="$commit_date" GIT_AUTHOR_DATE="$commit_date" \
  git commit -m "Backdated commit for $commit_date"
done

echo "✅ Created 20 backdated commits successfully."
