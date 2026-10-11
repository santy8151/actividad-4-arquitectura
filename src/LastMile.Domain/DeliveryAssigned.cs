namespace LastMile.Domain.Events;

public sealed record DeliveryAssigned(
    Guid EventId,
    Guid DeliveryId,
    Guid CourierId,
    DateTimeOffset OccurredAtUtc);
