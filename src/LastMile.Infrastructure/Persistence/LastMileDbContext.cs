using LastMile.Domain;
using Microsoft.EntityFrameworkCore;

namespace LastMile.Infrastructure.Persistence;

public sealed class LastMileDbContext(DbContextOptions<LastMileDbContext> options) : DbContext(options)
{
    public DbSet<DeliveryRecord> Deliveries => Set<DeliveryRecord>();
    public DbSet<OutboxRecord> Outbox => Set<OutboxRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var delivery = modelBuilder.Entity<DeliveryRecord>();
        delivery.ToTable("deliveries");
        delivery.HasKey(x => x.Id);
        delivery.Property(x => x.Address).HasMaxLength(300).IsRequired();
        delivery.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        delivery.Property(x => x.Version).IsConcurrencyToken();

        var outbox = modelBuilder.Entity<OutboxRecord>();
        outbox.ToTable("outbox_messages");
        outbox.HasKey(x => x.EventId);
        outbox.Property(x => x.EventType).HasMaxLength(200).IsRequired();
        outbox.Property(x => x.Payload).IsRequired();
        outbox.HasIndex(x => new { x.PublishedAtUtc, x.DeadLetteredAtUtc, x.NextAttemptAtUtc });
    }
}
