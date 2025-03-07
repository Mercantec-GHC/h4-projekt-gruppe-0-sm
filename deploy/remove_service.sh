#!/bin/sh

SERVICE=h4backend.service

set -xe

systemctl stop $SERVICE
systemctl disable $SERVICE

sudo rm /etc/systemd/$SERVICE



