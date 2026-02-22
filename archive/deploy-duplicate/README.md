# ATTENDING AI - Deployment Guide

## Overview

This directory contains deployment configurations for ATTENDING AI across different environments and platforms.

## Directory Structure

```
deploy/
├── kubernetes/                    # Kubernetes manifests
│   ├── 00-namespace.yaml         # Namespace and quotas
│   ├── 01-config.yaml            # ConfigMaps and Secrets
│   ├── 02-api-deployment.yaml    # API deployment
│   ├── 03-services.yaml          # Services and Ingress
│   ├── 04-monitoring.yaml        # Prometheus/Grafana config
│   └── values.yaml               # Helm-style values
└── README.md                      # This file
```

## Prerequisites

### Required Tools

- **kubectl** v1.28+ - Kubernetes CLI
- **helm** v3.13+ - Package manager (optional)
- **az** - Azure CLI (for AKS)
- **docker** - Container runtime

### Cloud Resources

1. **Azure Kubernetes Service (AKS)** cluster
2. **Azure SQL Database** for production data
3. **Azure Cache for Redis** for caching/SignalR backplane
4. **Azure Key Vault** for secrets management
5. **Azure Container Registry** for Docker images
6. **Azure AD B2C** tenant for authentication

## Quick Start

### 1. Connect to AKS Cluster

```bash
# Login to Azure
az login

# Get AKS credentials
az aks get-credentials --resource-group attending-rg --name attending-aks
```

### 2. Create Namespace

```bash
kubectl apply -f kubernetes/00-namespace.yaml
```

### 3. Configure Secrets

**Option A: Manual (Development)**
```bash
# Edit secrets in 01-config.yaml, then apply
kubectl apply -f kubernetes/01-config.yaml
```

**Option B: External Secrets Operator (Production)**
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

# Create ClusterSecretStore for Azure Key Vault
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-key-vault
spec:
  provider:
    azurekv:
      authType: ManagedIdentity
      vaultUrl: "https://attending-kv.vault.azure.net"
EOF

# Apply config (will create secrets from Key Vault)
kubectl apply -f kubernetes/01-config.yaml
```

### 4. Deploy API

```bash
# Apply deployment
kubectl apply -f kubernetes/02-api-deployment.yaml

# Apply services and ingress
kubectl apply -f kubernetes/03-services.yaml

# Verify deployment
kubectl get pods -n attending
kubectl get svc -n attending
kubectl get ingress -n attending
```

### 5. Configure Monitoring (Optional)

```bash
# Requires Prometheus Operator
kubectl apply -f kubernetes/04-monitoring.yaml
```

## Environment-Specific Deployments

### Development

```bash
# Use reduced resources
kubectl apply -f kubernetes/ --namespace=attending-dev

# Or with Kustomize
kubectl apply -k overlays/development
```

### Staging

```bash
# Deploy to staging namespace
kubectl apply -f kubernetes/ --namespace=attending-staging
```

### Production

```bash
# Deploy with production values
kubectl apply -f kubernetes/ --namespace=attending

# Verify all pods are running
kubectl get pods -n attending -w
```

## Scaling

### Manual Scaling

```bash
# Scale API pods
kubectl scale deployment attending-api --replicas=5 -n attending
```

### Auto-scaling

The HPA (Horizontal Pod Autoscaler) is configured in `02-api-deployment.yaml`:
- Min replicas: 3
- Max replicas: 10
- Target CPU: 70%
- Target Memory: 80%

```bash
# Check HPA status
kubectl get hpa -n attending

# View autoscaling events
kubectl describe hpa attending-api-hpa -n attending
```

## Monitoring

### Health Checks

```bash
# Check API health
kubectl port-forward svc/attending-api 8080:80 -n attending

# In another terminal
curl http://localhost:8080/health
curl http://localhost:8080/health/ready
curl http://localhost:8080/health/live
```

### Logs

```bash
# View API logs
kubectl logs -f deployment/attending-api -n attending

# View logs from all pods
kubectl logs -f -l app.kubernetes.io/component=api -n attending
```

### Metrics

If Prometheus is configured:

```bash
# Port forward to Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n monitoring

# View metrics at http://localhost:9090
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n attending

# Check events
kubectl get events -n attending --sort-by='.lastTimestamp'
```

### Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=mcr.microsoft.com/mssql-tools --restart=Never -- \
  /opt/mssql-tools/bin/sqlcmd -S <server>.database.windows.net -U <user> -P <password> -Q "SELECT 1"

# Test Redis connectivity
kubectl run -it --rm debug --image=redis:alpine --restart=Never -- \
  redis-cli -h <redis-host> -a <password> ping
```

### Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n attending

# View cert-manager logs
kubectl logs -f -l app=cert-manager -n cert-manager
```

## Rollback

```bash
# View deployment history
kubectl rollout history deployment/attending-api -n attending

# Rollback to previous version
kubectl rollout undo deployment/attending-api -n attending

# Rollback to specific revision
kubectl rollout undo deployment/attending-api --to-revision=2 -n attending
```

## Security Considerations

### Network Policies

Network policies are configured in `03-services.yaml` to:
- Allow ingress only from NGINX ingress controller
- Allow egress to Azure SQL (port 1433)
- Allow egress to Redis (port 6379)
- Allow DNS resolution

### Pod Security

Pods run with:
- Non-root user (UID 1000)
- Read-only root filesystem
- Dropped capabilities
- No privilege escalation

### Secrets Management

Production should use:
- Azure Key Vault with External Secrets Operator
- Managed Identity for authentication
- Regular secret rotation

## CI/CD Integration

The deployment can be automated via GitHub Actions:

```yaml
# In .github/workflows/deploy.yml
- name: Deploy to AKS
  run: |
    az aks get-credentials --resource-group attending-rg --name attending-aks
    kubectl apply -f deploy/kubernetes/ -n attending
```

## Useful Commands

```bash
# View all resources in namespace
kubectl get all -n attending

# Watch pod status
kubectl get pods -n attending -w

# Execute into a pod
kubectl exec -it <pod-name> -n attending -- /bin/sh

# Port forward for local testing
kubectl port-forward svc/attending-api 5000:80 -n attending

# View resource usage
kubectl top pods -n attending
```

---

## Support

For deployment issues, contact:
- **DevOps**: Peter (Azure specialist)
- **Backend**: Bill (CTO)
- **Clinical**: Dr. Isbell (CEO)
