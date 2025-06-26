using System.Linq.Expressions;

namespace SharedKernel;
public static class SpecificationsHelper
{
    public static Expression<Func<T, bool>> All<T>() => x => true;
    public static Expression<Func<T, bool>> All<T>(this Expression<Func<T, bool>> expression) => x => true;
    public static Expression<Func<T, bool>> Not<T>(this Expression<Func<T, bool>> expression) =>
        Expression.Lambda<Func<T, bool>>(Expression.Not(expression.Body), expression.Parameters.Single());
    public static Expression<Func<T, bool>> And<T>(this Expression<Func<T, bool>> left, Expression<Func<T, bool>> right)
    {
        ParameterExpression parameter = Expression.Parameter(typeof(T));
        BinaryExpression body = Expression.AndAlso(
            Expression.Invoke(left, parameter),
            Expression.Invoke(right, parameter)
        );
        return Expression.Lambda<Func<T, bool>>(body, parameter);
    }
    public static Expression<Func<T, bool>> Or<T>(this Expression<Func<T, bool>> left, Expression<Func<T, bool>> right)
    {
        ParameterExpression parameter = Expression.Parameter(typeof(T));
        BinaryExpression body = Expression.OrElse(
            Expression.Invoke(left, parameter),
            Expression.Invoke(right, parameter)
        );
        return Expression.Lambda<Func<T, bool>>(body, parameter);
    }
}