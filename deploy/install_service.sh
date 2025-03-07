#!/bin/sh

SERVICE=h4backend.service

set -xe

sudo cp deploy/$SERVICE /etc/systemd/$SERVICE
systemctl daemon-reload

systemctl enable $SERVICE
systemctl start $SERVICE

