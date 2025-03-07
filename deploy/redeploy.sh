#!/bin/sh

SERVICE=h4backend.service

set -xe

git pull --rebase

cd backend
make clean
make RELEASE=1
cd ..

systemctl --user restart $SERVICE

