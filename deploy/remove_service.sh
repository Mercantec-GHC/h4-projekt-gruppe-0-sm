#!/bin/sh

SERVICE=h4backend.service

set -xe

systemctl --user stop $SERVICE
systemctl --user disable $SERVICE

sudo rm /etc/systemd/user/$SERVICE



