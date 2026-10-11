using System.Diagnostics;
using LastMile.Application.Observability;
using LastMile.Application.Ports;
using LastMile.Domain;
using LastMile.Domain.Events;

namespace LastMile.Application.UseCases;

public enum AssignCourierFailure
{
    None,
    DeliveryNotFound,
    CourierUnavailable,
    RouteCapacityExceeded,
    DeliveryAlreadyAssigned,
    ConcurrentAssignment,
    IntegrationUnavailable
}

public sealed record AssignCourierResult(AssignCourierFailure Failure)
{
    public bool Succeeded => Failure == AssignCourierFailure.None;
    public static AssignCourierResult Success() => new(AssignCourierFailure.None);
    public static AssignCourierResult Reject(AssignCourierFailure failure) => new(failure);
}

public sealed class ConcurrencyConflictException : Exception { }

public sealed class AssignCourierUseCase(
    IDeliveryRepository deliveries,
    ICourierAvailability couriers,
    IRouteCapacity routes,
    IAssignmentEvents events,
    IAssignmentUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    AssignmentTelemetry telemetry)
{
    public async Task<AssignCourierResult> ExecuteAsync(
        DeliveryId deliveryId,
        CourierId courierId,
        CancellationToken cancellationToken = default)
    {
        using var activity = AssignmentTelemetry.ActivitySource.StartActivity("assign-courier");
        activity?.SetTag("delivery.id", deliveryId.Value);
        var started = Stopwatch.GetTimestamp();

        AssignCourierResult Track(AssignCourierResult result)
        {
            telemetry.Record(result, Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            activity?.SetTag("assignment.outcome", result.Failure.ToString());
            return result;
        }

        var delivery = await deliveries.GetAsync(deliveryId, cancellationToken);
        if (delivery is null)
            return Track(AssignCourierResult.Reject(AssignCourierFailure.DeliveryNotFound));

        if (delivery.Status != DeliveryStatus.Pending || delivery.CourierId is not null)
            return Track(AssignCourierResult.Reject(AssignCourierFailure.DeliveryAlreadyAssigned));

        try
        {
            if (!await couriers.IsAvailableAsync(courierId, cancellationToken))
                return Track(AssignCourierResult.Reject(AssignCourierFailure.CourierUnavailable));

            if (!await routes.CanAcceptAsync(deliveryId, cancellationToken))
                return Track(AssignCourierResult.Reject(AssignCourierFailure.RouteCapacityExceeded));
        }
        catch (IntegrationUnavailableException)
        {
            return Track(AssignCourierResult.Reject(AssignCourierFailure.IntegrationUnavailable));
        }

        try
        {
            delivery.AssignCourier(courierId);
            await events.RecordAsync(new DeliveryAssigned(
                Guid.NewGuid(), delivery.Id.Value, courierId.Value, timeProvider.GetUtcNow()), cancellationToken);
            await deliveries.SaveAsync(delivery, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);
            return Track(AssignCourierResult.Success());
        }
        catch (ConcurrencyConflictException)
        {
            return Track(AssignCourierResult.Reject(AssignCourierFailure.ConcurrentAssignment));
        }
        catch (DomainRuleViolationException exception) when (exception.Code == "DeliveryAlreadyAssigned")
        {
            return Track(AssignCourierResult.Reject(AssignCourierFailure.DeliveryAlreadyAssigned));
        }
    }
}