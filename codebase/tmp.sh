#!/bin/bash
set -e

# Останавливаем VM (compute charges прекращаются; диск ~$0.80/мес остаётся)
gcloud compute instances stop salesops-pilot \
  --project=salesops-crm-pilot \
  --zone=europe-west1-b
