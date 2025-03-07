#!/bin/sh

SERVICE=h4_backend.service

set -xe

set +e
systemctl stop $SERVICE
systemctl disable $SERVICE
set -e

sudo rm -rf /etc/systemd/system/$SERVICE



