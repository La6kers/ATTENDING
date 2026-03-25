using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace ATTENDING.Orders.Api.Services;

/// <summary>
/// Development-only authentication handler that auto-authenticates all requests
/// as a seeded provider identity.
///
/// Activated only when Authentication:DevBypass = true AND environment is Development.
/// Never registers in production \u2014 the condition check in Program.cs enforces this.
///
/// Extracted from Program.cs to keep startup lean and the class discoverable
/// in code search / PR review.
/// </summary>
public class DevAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public DevAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Create a dev identity with realistic provider claims so all
        // controller authorization attributes pass in local development.
        var claims = new[]
        {
            new Claim("sub",        "00000000-0000-0000-0000-000000000001"),
            new Claim("oid",        "00000000-0000-0000-0000-000000000001"),
            new Claim("tenant_id",  "00000000-0000-0000-0000-000000000001"),
            new Claim(ClaimTypes.Email, "dev.provider@attending.local"),
            new Claim(ClaimTypes.Name,  "Dev Provider"),
            new Claim(ClaimTypes.Role,  "Provider"),
        };

        var identity  = new ClaimsIdentity(claims, "DevBypass");
        var principal = new ClaimsPrincipal(identity);
        var ticket    = new AuthenticationTicket(principal, "DevBypass");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
