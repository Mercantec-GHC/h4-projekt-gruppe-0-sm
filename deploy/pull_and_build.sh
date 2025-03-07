#!/bin/sh

git pull --rebase

cd backend
make clean
make RELEASE=1
cd ..

