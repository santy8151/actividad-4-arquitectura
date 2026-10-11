using LastMile.Domain;

namespace LastMile.Application.Ports;

public interface IDeliveryRepository
{
    Task<Delivery?> GetAsync(DeliveryId id, CancellationToken cancellationToken);
    Task SaveAsync(Delivery delivery, CancellationToken cancellationToken);
}

public interface ICourierAvailability
{
    Task<bool> IsAvailableAsync(CourierId courierId, CancellationToken cancellationToken);
}

public interface IRouteCapacity
{
    Task<bool> CanAcceptAsync(DeliveryId deliveryId, CancellationToken cancellationToken);
}

public interface IAssignmentEvents
{
    Task RecordAsync(Delivery delivery, CancellationToken cancellationToken);
}
