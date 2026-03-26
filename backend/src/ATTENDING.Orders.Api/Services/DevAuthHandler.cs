using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace ATTENDING.Orders.Api.Services;

/// <summary>
/// Development-only authentication handler that auto-authenticates all requests
/// as a seeded provider identity.
///
/// HARD GATE: Constructor throws if the hosting environment is anything other
/// than "Development". This is a defense-in-depth measure -- Program.cs also
/// prevents registration, but this handler refuses to operate even if
/// misconfigured code somehow registers it outside Development.
///
/// Extracted from Program.cs to keep startup lean and the class discoverable
/// in code search / PR review.
/// </summary>
public class DevAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IHostEnvironment _env;

    public DevAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IHostEnvironment env)
        : base(options, logger, encoder)
    {
        _env = env;

        // HARD GATE: refuse to construct outside Development
        if (!_env.IsDevelopment())
        {
            throw new InvalidOperationException(
                "SECURITY VIOLATION: DevAuthHandler instantiated in " +
                $"'{_env.EnvironmentName}' environment. " +
                "This handler is strictly limited to Development. " +
                "Remove Authentication:DevBypass from configuration immediately.");
        }
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Runtime guard -- belt-and-suspenders check in case constructor guard is bypassed
        if (!_env.IsDevelopment())
        {
            return Task.FromResult(AuthenticateResult.Fail(
                "DevAuthHandler cannot authenticate outside Development environment."));
        }

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
