namespace LastMile.Domain.Tests;

using LastMile.Domain;

public sealed class DeliveryTests
{
    private static readonly DeliveryId DeliveryId = new(Guid.Parse("d1000000-0000-4000-8000-000000000001"));
    private static readonly CourierId FirstCourier = new(Guid.Parse("c0000000-0000-4000-8000-000000000001"));

    [Fact]
    public void AssignCourier_ChangesCourierAndStatus()
    {
        var delivery = new Delivery(DeliveryId, new DeliveryAddress("Demo address"));

        delivery.AssignCourier(FirstCourier);

        Assert.Equal(FirstCourier, delivery.CourierId);
        Assert.Equal(DeliveryStatus.Assigned, delivery.Status);
        Assert.Equal(2, delivery.Version);
    }

    [Fact]
    public void AssignCourier_WhenAlreadyAssigned_RejectsWithoutChangingOriginalAssignment()
    {
        var delivery = new Delivery(DeliveryId, new DeliveryAddress("Demo address"));
        delivery.AssignCourier(FirstCourier);
        var originalVersion = delivery.Version;

        var error = Assert.Throws<DomainRuleViolationException>(() =>
            delivery.AssignCourier(new CourierId(Guid.Parse("c0000000-0000-4000-8000-000000000002"))));

        Assert.Equal("DeliveryAlreadyAssigned", error.Code);
        Assert.Equal(FirstCourier, delivery.CourierId);
        Assert.Equal(DeliveryStatus.Assigned, delivery.Status);
        Assert.Equal(originalVersion, delivery.Version);
    }

    [Fact]
    public void AssignCourier_WhenCourierIdIsEmpty_RejectsAndLeavesDeliveryPending()
    {
        var delivery = new Delivery(DeliveryId, new DeliveryAddress("Demo address"));

        var error = Assert.Throws<DomainRuleViolationException>(() => delivery.AssignCourier(new CourierId(Guid.Empty)));

        Assert.Equal("InvalidCourierId", error.Code);
        Assert.Null(delivery.CourierId);
        Assert.Equal(DeliveryStatus.Pending, delivery.Status);
    }
}
