namespace LastMile.Domain;

public readonly record struct DeliveryId(Guid Value);
public readonly record struct CourierId(Guid Value);
public sealed record DeliveryAddress(string Value);

public enum DeliveryStatus
{
    Pending,
    Assigned
}

public sealed class Delivery
{
    public DeliveryId Id { get; }
    public DeliveryAddress Address { get; }
    public CourierId? CourierId { get; private set; }
    public DeliveryStatus Status { get; private set; }

    public Delivery(DeliveryId id, DeliveryAddress address)
    {
        Id = id;
        Address = address;
        Status = DeliveryStatus.Pending;
    }

    public void AssignCourier(CourierId courierId)
    {
        if (CourierId is not null)
            throw new InvalidOperationException("Delivery already assigned");

        CourierId = courierId;
        Status = DeliveryStatus.Assigned;
    }
}
