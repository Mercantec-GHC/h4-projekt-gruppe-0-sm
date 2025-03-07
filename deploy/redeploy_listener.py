#!/bin/python3

import time
import os

def main():
    deployed_commit_hash = ""
    while True:
        newest_commit_hash = os.popen("curl -s https://api.github.com/repos/Mercantec-GHC/h4-projekt-gruppe-0-sm/commits/main | jq -r .sha").read()

        if not newest_commit_hash:
            print("error fetching commit hash")
            time.sleep(60)
            continue

        if newest_commit_hash != deployed_commit_hash:
            deployed_commit_hash = newest_commit_hash
            print("should redeploy")
        else:
            print("should not redeploy")


        time.sleep(60)

if __name__ == "__main__":
    main()

