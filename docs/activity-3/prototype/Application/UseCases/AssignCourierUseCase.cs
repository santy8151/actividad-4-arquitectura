using LastMile.Application.Ports;
using LastMile.Domain;

namespace LastMile.Application.UseCases;

public sealed class AssignCourierUseCase(
    IDeliveryRepository deliveries,
    ICourierAvailability couriers,
    IRouteCapacity routes,
    IAssignmentEvents events)
{
    public async Task ExecuteAsync(
        DeliveryId deliveryId,
        CourierId courierId,
        CancellationToken cancellationToken = default)
    {
        var delivery = await deliveries.GetAsync(deliveryId, cancellationToken)
            ?? throw new InvalidOperationException("Delivery not found");

        if (!await couriers.IsAvailableAsync(courierId, cancellationToken))
            throw new InvalidOperationException("Courier unavailable");

        if (!await routes.CanAcceptAsync(deliveryId, cancellationToken))
            throw new InvalidOperationException("Route capacity exceeded");

        delivery.AssignCourier(courierId);
        await deliveries.SaveAsync(delivery, cancellationToken);
        await events.RecordAsync(delivery, cancellationToken);
    }
}
