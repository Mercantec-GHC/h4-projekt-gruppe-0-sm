#!/bin/sh

set -xe

sh deploy/remove_service.sh

# avoid 'could not bind to socket' error
fuser -k 8080/tcp

git pull --rebase

cd backend
make clean
make RELEASE=1
cd ..

sh deploy/install_service.sh

