using Microsoft.AspNetCore.Mvc;
using ATTENDING.Domain.Common;

namespace ATTENDING.Orders.Api.Extensions;

/// <summary>
/// Maps Result&lt;T&gt; to proper HTTP responses.
/// Eliminates manual if(!result.Success) boilerplate in controllers.
/// </summary>
public static class ResultExtensions
{
    /// <summary>
    /// Map a Result&lt;T&gt; to 200 OK on success, or the appropriate error response.
    /// </summary>
    public static ActionResult<T> ToOk<T>(this Result<T> result)
    {
        return result.IsSuccess
            ? new OkObjectResult(result.Value)
            : ToErrorResult<T>(result.Error);
    }

    /// <summary>
    /// Map a Result&lt;T&gt; to 201 Created on success with a location header.
    /// </summary>
    public static IActionResult ToCreated<T>(this Result<T> result, string location)
    {
        return result.IsSuccess
            ? new CreatedResult(location, result.Value)
            : ToErrorResult(result.Error);
    }

    /// <summary>
    /// Map a Result&lt;T&gt; to 201 Created using CreatedAtAction.
    /// </summary>
    public static IActionResult ToCreatedAtAction<T>(
        this Result<T> result, string actionName, object? routeValues)
    {
        if (result.IsSuccess)
            return new CreatedAtActionResult(actionName, null, routeValues, result.Value);

        return ToErrorResult(result.Error);
    }

    /// <summary>
    /// Map a non-generic Result to 204 NoContent on success.
    /// </summary>
    public static IActionResult ToNoContent(this Result result)
    {
        return result.IsSuccess
            ? new NoContentResult()
            : ToErrorResult(result.Error);
    }

    /// <summary>
    /// Map a Result&lt;Unit&gt; to 204 NoContent on success.
    /// Used for void-like commands that return Result&lt;Unit&gt; via MediatR.
    /// </summary>
    public static IActionResult ToNoContent<T>(this Result<T> result)
    {
        return result.IsSuccess
            ? new NoContentResult()
            : ToErrorResult(result.Error);
    }

    /// <summary>
    /// Map an error code to the appropriate HTTP status code and ProblemDetails.
    /// </summary>
    private static ActionResult<T> ToErrorResult<T>(Error error)
    {
        var problem = ToProblemDetails(error);
        return new ObjectResult(problem) { StatusCode = problem.Status };
    }

    private static IActionResult ToErrorResult(Error error)
    {
        var problem = ToProblemDetails(error);
        return new ObjectResult(problem) { StatusCode = problem.Status };
    }

    private static ProblemDetails ToProblemDetails(Error error)
    {
        var statusCode = error.Code switch
        {
            _ when error.Code.EndsWith("NotFound") => StatusCodes.Status404NotFound,
            _ when error.Code.EndsWith("DuplicateMrn") => StatusCodes.Status409Conflict,
            _ when error.Code.EndsWith("DuplicateEmail") => StatusCodes.Status409Conflict,
            _ when error.Code.StartsWith("Concurrency") => StatusCodes.Status409Conflict,
            _ when error.Code.EndsWith("Conflict") || error.Code == Error.Conflict.Code => StatusCodes.Status409Conflict,
            _ when error.Code.EndsWith("Forbidden") || error.Code == Error.Forbidden.Code => StatusCodes.Status403Forbidden,
            _ when error.Code.EndsWith("InvalidTransition") => StatusCodes.Status422UnprocessableEntity,
            _ when error.Code.EndsWith("CannotCancel") => StatusCodes.Status422UnprocessableEntity,
            _ when error.Code.EndsWith("AlreadyCompleted") => StatusCodes.Status422UnprocessableEntity,
            _ when error.Code.EndsWith("AlreadyCancelled") => StatusCodes.Status422UnprocessableEntity,
            _ when error.Code.EndsWith("InvalidPhase") => StatusCodes.Status422UnprocessableEntity,
            _ => StatusCodes.Status400BadRequest
        };

        return new ProblemDetails
        {
            Title = error.Code,
            Detail = error.Message,
            Status = statusCode,
            Extensions = { ["errorCode"] = error.Code }
        };
    }
}
