using LastMile.Application.Ports;
using LastMile.Domain;
using Microsoft.Extensions.Configuration;

namespace LastMile.Infrastructure.Integrations;

public sealed class DemoCourierAvailabilityAdapter(IConfiguration configuration) : ICourierAvailability
{
    private readonly HashSet<Guid> _availableCouriers = configuration
        .GetSection("DemoIntegration:AvailableCouriers")
        .Get<string[]>()?
        .Select(Guid.Parse)
        .ToHashSet() ?? [];

    public Task<bool> IsAvailableAsync(CourierId courierId, CancellationToken cancellationToken) =>
        Task.FromResult(_availableCouriers.Contains(courierId.Value));
}

public sealed class DemoRouteCapacityAdapter(IConfiguration configuration) : IRouteCapacity
{
    private readonly bool _hasCapacity = configuration.GetValue("DemoIntegration:RouteHasCapacity", true);

    public Task<bool> CanAcceptAsync(DeliveryId deliveryId, CancellationToken cancellationToken) =>
        Task.FromResult(_hasCapacity);
}
