#!/bin/sh

SERVICE=h4_backend.service

set -xe

sudo cp deploy/$SERVICE /etc/systemd/system/$SERVICE
systemctl daemon-reload

systemctl enable $SERVICE
systemctl start $SERVICE

