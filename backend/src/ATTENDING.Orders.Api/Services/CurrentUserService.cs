using System.Security.Claims;
using ATTENDING.Domain.Interfaces;

namespace ATTENDING.Orders.Api.Services;

/// <summary>
/// Extracts current user identity from HttpContext for audit trails and tenant isolation.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? UserId =>
        _httpContextAccessor.HttpContext?.User?.FindFirst("sub")?.Value
        ?? _httpContextAccessor.HttpContext?.User?.FindFirst("oid")?.Value
        ?? _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    public string? Email =>
        _httpContextAccessor.HttpContext?.User?.FindFirst("email")?.Value
        ?? _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Email)?.Value;

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    /// <summary>
    /// Resolves the tenant (organization) ID from the JWT.
    /// 
    /// Resolution order:
    /// 1. Custom "tenant_id" claim (set by Azure AD B2C custom policy or app role assignment)
    /// 2. "oid" claim (Azure AD object ID — maps 1:1 to organization in single-tenant-per-AD setups)
    /// 3. Falls back to null (system/anonymous context — interceptor will reject entity creation)
    /// 
    /// In production with Azure AD B2C, the tenant_id claim should be populated
    /// from the user's organization assignment during token issuance.
    /// </summary>
    public Guid? TenantId
    {
        get
        {
            var tenantClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("tenant_id")?.Value
                           ?? _httpContextAccessor.HttpContext?.User?.FindFirst("oid")?.Value;

            return Guid.TryParse(tenantClaim, out var tenantId) ? tenantId : null;
        }
    }
}
