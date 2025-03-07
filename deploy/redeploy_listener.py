#!/bin/python3 -u

import time
import os
import subprocess
import sys

INTERVAL_DELAY = 300
ERROR_DELAY = 60

def main():
    dry_run = "--dry-run" in sys.argv

    deployed_commit_hash = ""
    while True:
        print("fetching newest commit...")

        newest_commit_hash = os.popen("curl -s https://api.github.com/repos/Mercantec-GHC/h4-projekt-gruppe-0-sm/commits/main | jq -r .sha").read()

        if not newest_commit_hash:
            print("error: could not fetch commit hash", file=sys.stderr)
            print(f"trying again in {ERROR_DELAY} seconds...", file=sys.stderr)
            time.sleep(ERROR_DELAY)
            continue

        if newest_commit_hash != deployed_commit_hash:
            deployed_commit_hash = newest_commit_hash
            print("new commit found. redeploying...")

            if not dry_run:
                rcode = subprocess.call(["sh", "./deploy/redeploy_as_root.sh"])
                if rcode == 0:
                    print("redeployed successfully")
                else:
                    print("error: could not redeploy", file=sys.stderr)
        else:
            print("no new commits")

        print(f"sleeping for {INTERVAL_DELAY} seconds...")
        time.sleep(INTERVAL_DELAY)

if __name__ == "__main__":
    main()

