namespace LastMile.Domain;

public readonly record struct DeliveryId(Guid Value);
public readonly record struct CourierId(Guid Value);
public sealed record DeliveryAddress(string Value);

public enum DeliveryStatus
{
    Pending = 0,
    Assigned = 1
}

public sealed class Delivery
{
    private Delivery() { }

    private Delivery(DeliveryId id, DeliveryAddress address, CourierId? courierId, DeliveryStatus status, int version)
    {
        Id = id;
        Address = address;
        CourierId = courierId;
        Status = status;
        Version = version;
    }

    public DeliveryId Id { get; private set; }
    public DeliveryAddress Address { get; private set; } = new(string.Empty);
    public CourierId? CourierId { get; private set; }
    public DeliveryStatus Status { get; private set; }
    public int Version { get; private set; }

    public Delivery(DeliveryId id, DeliveryAddress address)
    {
        if (id.Value == Guid.Empty)
            throw new DomainRuleViolationException("InvalidDeliveryId", "A delivery must have a non-empty identifier.");
        if (string.IsNullOrWhiteSpace(address.Value))
            throw new DomainRuleViolationException("InvalidDeliveryAddress", "A delivery address is required.");

        Id = id;
        Address = address;
        Status = DeliveryStatus.Pending;
        Version = 1;
    }

    public static Delivery Rehydrate(
        DeliveryId id,
        DeliveryAddress address,
        CourierId? courierId,
        DeliveryStatus status,
        int version) => new(id, address, courierId, status, version);

    public void AssignCourier(CourierId courierId)
    {
        if (courierId.Value == Guid.Empty)
            throw new DomainRuleViolationException("InvalidCourierId", "A courier must have a non-empty identifier.");
        if (Status != DeliveryStatus.Pending || CourierId is not null)
            throw new DomainRuleViolationException("DeliveryAlreadyAssigned", "The delivery already has an active courier.");

        CourierId = courierId;
        Status = DeliveryStatus.Assigned;
        Version++;
    }
}
