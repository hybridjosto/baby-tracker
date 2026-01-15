#!/usr/bin/env bash
sudo systemctl daemon-reload
sudo systemctl enable --now baby-tracker.service
journalctl -u baby-tracker.service -f
