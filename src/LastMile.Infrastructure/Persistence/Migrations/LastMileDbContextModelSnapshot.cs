using LastMile.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace LastMile.Infrastructure.Persistence.Migrations;

[DbContext(typeof(LastMileDbContext))]
public sealed class LastMileDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasAnnotation("ProductVersion", "10.0.12")
            .HasAnnotation("Relational:MaxIdentifierLength", 64);

        modelBuilder.Entity("LastMile.Infrastructure.Persistence.DeliveryRecord", entity =>
        {
            entity.Property<Guid>("Id").HasColumnType("TEXT");
            entity.Property<string>("Address").IsRequired().HasMaxLength(300).HasColumnType("TEXT");
            entity.Property<Guid?>("CourierId").HasColumnType("TEXT");
            entity.Property<DeliveryStatus>("Status").HasMaxLength(20).HasColumnType("TEXT");
            entity.Property<int>("Version").IsConcurrencyToken().HasColumnType("INTEGER");
            entity.HasKey("Id");
            entity.ToTable("deliveries");
        });

        modelBuilder.Entity("LastMile.Infrastructure.Persistence.OutboxRecord", entity =>
        {
            entity.Property<Guid>("EventId").HasColumnType("TEXT");
            entity.Property<int>("Attempts").HasColumnType("INTEGER");
            entity.Property<DateTimeOffset?>("DeadLetteredAtUtc").HasColumnType("TEXT");
            entity.Property<string>("EventType").IsRequired().HasMaxLength(200).HasColumnType("TEXT");
            entity.Property<DateTimeOffset>("NextAttemptAtUtc").HasColumnType("TEXT");
            entity.Property<DateTimeOffset>("OccurredAtUtc").HasColumnType("TEXT");
            entity.Property<string>("Payload").IsRequired().HasColumnType("TEXT");
            entity.Property<DateTimeOffset?>("PublishedAtUtc").HasColumnType("TEXT");
            entity.HasKey("EventId");
            entity.HasIndex("PublishedAtUtc", "DeadLetteredAtUtc", "NextAttemptAtUtc");
            entity.ToTable("outbox_messages");
        });
    }
}
