using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LastMile.Domain;
using LastMile.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LastMile.IntegrationTests;

public sealed class AssignmentApiTests
{
    private static readonly Guid CourierId = Guid.Parse("c0000000-0000-4000-8000-000000000001");

    [Fact]
    public async Task AssignCourier_HappyPath_PersistsDeliveryAndOutboxEvent()
    {
        await using var factory = new AssignmentApiFactory(routeHasCapacity: true);
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            $"/api/deliveries/{DatabaseInitializer.DemoDeliveryId}/courier-assignment",
            new { courierId = CourierId });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LastMileDbContext>();
        var stored = await db.Deliveries.SingleAsync(x => x.Id == DatabaseInitializer.DemoDeliveryId);
        var outbox = await db.Outbox.SingleAsync();
        Assert.Equal(DeliveryStatus.Assigned, stored.Status);
        Assert.Equal(CourierId, stored.CourierId);
        Assert.Equal("DeliveryAssigned", outbox.EventType);
        Assert.Null(outbox.PublishedAtUtc);
    }

    [Fact]
    public async Task AssignCourier_WhenRouteIsFull_ReturnsConflictAndLeavesNoSideEffects()
    {
        await using var factory = new AssignmentApiFactory(routeHasCapacity: false);
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            $"/api/deliveries/{DatabaseInitializer.DemoDeliveryId}/courier-assignment",
            new { courierId = CourierId });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("RouteCapacityExceeded", body.RootElement.GetProperty("code").GetString());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LastMileDbContext>();
        var stored = await db.Deliveries.SingleAsync(x => x.Id == DatabaseInitializer.DemoDeliveryId);
        Assert.Equal(DeliveryStatus.Pending, stored.Status);
        Assert.Null(stored.CourierId);
        Assert.Empty(await db.Outbox.ToListAsync());
    }

    private sealed class AssignmentApiFactory : WebApplicationFactory<Program>
    {
        private readonly bool _routeHasCapacity;
        private readonly SqliteConnection _connection = new("Data Source=:memory:");

        public AssignmentApiFactory(bool routeHasCapacity) => _routeHasCapacity = routeHasCapacity;

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            _connection.Open();
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["DemoIntegration:AvailableCouriers:0"] = CourierId.ToString(),
                    ["DemoIntegration:RouteHasCapacity"] = _routeHasCapacity.ToString(),
                    ["Outbox:DispatchEnabled"] = "false"
                }));
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<LastMileDbContext>>();
                services.RemoveAll<LastMileDbContext>();
                services.AddDbContext<LastMileDbContext>(options => options.UseSqlite(_connection));
            });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing)
                _connection.Dispose();
        }
    }
}
