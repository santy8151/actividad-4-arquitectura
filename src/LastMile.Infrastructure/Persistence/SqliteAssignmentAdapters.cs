using System.Text.Json;
using LastMile.Application.Ports;
using LastMile.Application.UseCases;
using LastMile.Domain;
using LastMile.Domain.Events;
using Microsoft.EntityFrameworkCore;

namespace LastMile.Infrastructure.Persistence;

public sealed class SqliteDeliveryRepository(LastMileDbContext db) : IDeliveryRepository, IDeliveryReadRepository
{
    public async Task<Delivery?> GetAsync(DeliveryId id, CancellationToken cancellationToken)
    {
        var row = await db.Deliveries.SingleOrDefaultAsync(x => x.Id == id.Value, cancellationToken);
        return row?.ToDomain();
    }

    public async Task<Delivery?> GetSnapshotAsync(DeliveryId id, CancellationToken cancellationToken)
    {
        var row = await db.Deliveries.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id.Value, cancellationToken);
        return row?.ToDomain();
    }

    public async Task SaveAsync(Delivery delivery, CancellationToken cancellationToken)
    {
        var row = await db.Deliveries.SingleOrDefaultAsync(x => x.Id == delivery.Id.Value, cancellationToken);
        if (row is null)
            throw new InvalidOperationException("The delivery disappeared before the assignment was committed.");

        row.CourierId = delivery.CourierId?.Value;
        row.Status = delivery.Status;
        row.Version = delivery.Version;
    }
}

public sealed class SqliteAssignmentEvents(LastMileDbContext db) : IAssignmentEvents
{
    public Task RecordAsync(DeliveryAssigned @event, CancellationToken cancellationToken)
    {
        db.Outbox.Add(new OutboxRecord
        {
            EventId = @event.EventId,
            EventType = nameof(DeliveryAssigned),
            Payload = JsonSerializer.Serialize(@event),
            OccurredAtUtc = @event.OccurredAtUtc,
            NextAttemptAtUtc = @event.OccurredAtUtc
        });
        return Task.CompletedTask;
    }
}

public sealed class SqliteAssignmentUnitOfWork(LastMileDbContext db) : IAssignmentUnitOfWork
{
    public async Task CommitAsync(CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            throw new ConcurrencyConflictException();
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            throw;
        }
    }
}
