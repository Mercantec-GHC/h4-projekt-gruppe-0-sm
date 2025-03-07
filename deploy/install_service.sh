#!/bin/sh

SERVICE=h4backend.service

set -xe

sudo cp deploy/$SERVICE /etc/systemd/user/$SERVICE
systemctl --user daemon-reload

systemctl --user enable $SERVICE
systemctl --user start $SERVICE



