# ATTENDING AI - Disaster Recovery Runbook

## Emergency Response Procedures

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Classification:** CONFIDENTIAL - INTERNAL USE ONLY

---

## 1. Overview

### 1.1 Purpose

This runbook provides step-by-step procedures for recovering ATTENDING AI services during a disaster or major outage.

### 1.2 Recovery Objectives

| Metric | Target | Maximum |
|--------|--------|---------|
| Recovery Point Objective (RPO) | 5 minutes | 1 hour |
| Recovery Time Objective (RTO) | 2 hours | 4 hours |
| Maximum Tolerable Downtime (MTD) | 4 hours | 8 hours |

### 1.3 Infrastructure Overview

```
Primary Region: Azure East US 2
DR Region: Azure Central US

┌─────────────────────────────────────────────────────────────┐
│                    Azure Traffic Manager                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                      ▼
┌───────────────────┐                ┌───────────────────┐
│  PRIMARY (East)   │   Replication  │  DR (Central)     │
│  • AKS Cluster    │ ─────────────► │  • AKS Cluster    │
│  • PostgreSQL     │                │  • PostgreSQL     │
│  • Redis          │                │  • Redis          │
└───────────────────┘                └───────────────────┘
```

---

## 2. Contact Information

### 2.1 Escalation Chain

| Level | Role | Response Time |
|-------|------|---------------|
| L1 | On-Call Engineer | 5 minutes |
| L2 | Platform Lead | 15 minutes |
| L3 | CTO | 30 minutes |
| L4 | CEO | 1 hour |

---

## 3. Incident Classification

| Severity | Definition | Response |
|----------|------------|----------|
| **SEV-1** | Complete service outage | Immediate, all hands |
| **SEV-2** | Major functionality impaired | 15 min response |
| **SEV-3** | Partial degradation | 1 hour response |
| **SEV-4** | Minor issue | Next business day |

---

## 4. Database Recovery

### 4.1 Point-in-Time Recovery (PITR)

```bash
# Step 1: Create restored server from backup
az postgres flexible-server restore \
  --resource-group attending-prod \
  --name attending-db-restored \
  --source-server attending-db-primary \
  --restore-time "2026-01-20T10:00:00Z"

# Step 2: Update Kubernetes secret
kubectl edit secret provider-portal-secrets -n attending-ai

# Step 3: Restart applications
kubectl rollout restart deployment/provider-portal -n attending-ai
```

### 4.2 Failover to Read Replica

```bash
# Promote replica to primary
az postgres flexible-server replica stop-replication \
  --resource-group attending-prod \
  --name attending-db-replica

# Update connection strings and restart
kubectl rollout restart deployment -n attending-ai
```

---

## 5. Application Recovery

### 5.1 Single Service Recovery

```bash
# Check recent deployments
kubectl rollout history deployment/<service-name> -n attending-ai

# Rollback if needed
kubectl rollout undo deployment/<service-name> -n attending-ai

# Force restart
kubectl delete pod -l app=<service-name> -n attending-ai
```

### 5.2 Full Cluster Recovery

```bash
# Restart cluster
az aks stop --resource-group attending-prod --name attending-aks
az aks start --resource-group attending-prod --name attending-aks
```

---

## 6. Complete Site Failover

### 6.1 Decision Criteria

Initiate full failover when:
- Primary region completely unavailable
- Recovery in primary region expected >2 hours
- Multiple critical services failing simultaneously

**Authorization Required:** CTO or CEO approval

### 6.2 Failover Procedure

```bash
# 1. Verify DR readiness
az aks show --resource-group attending-dr --name attending-aks-dr

# 2. Promote DR database
az postgres flexible-server replica stop-replication \
  --resource-group attending-dr \
  --name attending-db-dr

# 3. Scale up DR services
kubectl scale deployment/provider-portal --replicas=3 -n attending-ai
kubectl scale deployment/patient-portal --replicas=5 -n attending-ai

# 4. Update Traffic Manager
az network traffic-manager endpoint update \
  --profile-name attending-tm \
  --name primary-endpoint \
  --endpoint-status Disabled

az network traffic-manager endpoint update \
  --profile-name attending-tm \
  --name dr-endpoint \
  --endpoint-status Enabled \
  --priority 1

# 5. Verify
curl -I https://provider.attending.ai/api/health
```

---

## 7. Communication Procedures

### 7.1 Status Update Template

```
🚨 INCIDENT UPDATE - [SEV-X] [Brief Title]
Time: [Current time]
Status: [Investigating/Identified/Monitoring/Resolved]
Impact: [What's affected]
Current Actions: [What we're doing]
ETA: [Expected resolution time]
Next Update: [Time of next update]
```

---

## 8. Post-Incident Review

### 8.1 Timeline

| Time | Action |
|------|--------|
| +1 hour | Preliminary incident report |
| +24 hours | Detailed timeline document |
| +48 hours | Post-incident review meeting |
| +1 week | Final report with action items |

---

## Appendix: Quick Reference Commands

```bash
# Check all pod status
kubectl get pods -n attending-ai -o wide

# Get pod logs
kubectl logs -f deployment/provider-portal -n attending-ai

# Force pod restart
kubectl delete pod -l app=provider-portal -n attending-ai

# Scale deployment
kubectl scale deployment/provider-portal --replicas=5 -n attending-ai

# Rollback deployment
kubectl rollout undo deployment/provider-portal -n attending-ai

# Check Azure resource status
az resource list --resource-group attending-prod -o table
```

---

## Runbook Testing Schedule

| Test | Frequency | Last Tested |
|------|-----------|-------------|
| Database PITR | Quarterly | [Date] |
| Replica Failover | Monthly | [Date] |
| Full DR Failover | Semi-annually | [Date] |

---

*This document must be reviewed and tested regularly.*
