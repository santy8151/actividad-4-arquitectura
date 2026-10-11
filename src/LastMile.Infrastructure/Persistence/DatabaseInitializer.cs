using LastMile.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LastMile.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static readonly Guid DemoDeliveryId = Guid.Parse("d1000000-0000-4000-8000-000000000001");

    public static async Task InitializeAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<LastMileDbContext>();
        await db.Database.MigrateAsync(cancellationToken);

        if (!await db.Deliveries.AnyAsync(cancellationToken))
        {
            db.Deliveries.Add(DeliveryRecord.FromDomain(new Delivery(
                new DeliveryId(DemoDeliveryId),
                new DeliveryAddress("Calle 10 # 20-30, Bogotá (dato de demostración)"))));
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
