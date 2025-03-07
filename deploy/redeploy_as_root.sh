#!/bin/sh

set -xe

sh deploy/remove_service.sh

set +e
# avoid 'could not bind to socket' error
fuser -k 8080/tcp
set -e

su host -c 'sh deploy/pull_and_build.sh'

sh deploy/install_service.sh

