using LastMile.Domain;

namespace LastMile.Infrastructure.Persistence;

public sealed class DeliveryRecord
{
    public Guid Id { get; set; }
    public string Address { get; set; } = string.Empty;
    public Guid? CourierId { get; set; }
    public DeliveryStatus Status { get; set; }
    public int Version { get; set; }

    public static DeliveryRecord FromDomain(Delivery delivery) => new()
    {
        Id = delivery.Id.Value,
        Address = delivery.Address.Value,
        CourierId = delivery.CourierId?.Value,
        Status = delivery.Status,
        Version = delivery.Version
    };

    public Delivery ToDomain() => Delivery.Rehydrate(
        new DeliveryId(Id),
        new DeliveryAddress(Address),
        CourierId is null ? null : new CourierId(CourierId.Value),
        Status,
        Version);
}
