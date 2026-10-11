using System.Net.Http.Json;
using System.Text.Json;
using LastMile.Domain.Events;
using LastMile.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LastMile.Infrastructure.Integrations;

public interface IRouteEventPublisher
{
    Task PublishAsync(DeliveryAssigned @event, CancellationToken cancellationToken);
}

public sealed class LoggingRouteEventPublisher(ILogger<LoggingRouteEventPublisher> logger) : IRouteEventPublisher
{
    public Task PublishAsync(DeliveryAssigned @event, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Demo route event published. EventId={EventId} DeliveryId={DeliveryId} CourierId={CourierId}",
            @event.EventId, @event.DeliveryId, @event.CourierId);
        return Task.CompletedTask;
    }
}

public sealed class HttpRouteEventPublisher(HttpClient client) : IRouteEventPublisher
{
    public async Task PublishAsync(DeliveryAssigned @event, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "events/delivery-assigned")
        {
            Content = JsonContent.Create(@event)
        };
        request.Headers.TryAddWithoutValidation("Idempotency-Key", @event.EventId.ToString());
        using var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}

public sealed class OutboxDispatcher(
    IServiceScopeFactory scopeFactory,
    IRouteEventPublisher publisher,
    TimeProvider timeProvider,
    ILogger<OutboxDispatcher> logger) : BackgroundService
{
    private const int BatchSize = 20;
    private const int MaxAttempts = 5;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Outbox polling failed; the next poll will retry.");
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }

    private async Task DispatchBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LastMileDbContext>();
        var now = timeProvider.GetUtcNow();
        var pending = await db.Outbox
            .Where(x => x.PublishedAtUtc == null && x.DeadLetteredAtUtc == null && x.NextAttemptAtUtc <= now)
            .OrderBy(x => x.OccurredAtUtc)
            .Take(BatchSize)
            .ToListAsync(cancellationToken);

        foreach (var message in pending)
        {
            try
            {
                var @event = JsonSerializer.Deserialize<DeliveryAssigned>(message.Payload)
                    ?? throw new JsonException("Outbox payload was empty.");
                await publisher.PublishAsync(@event, cancellationToken);
                message.PublishedAtUtc = timeProvider.GetUtcNow();
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                message.Attempts++;
                if (message.Attempts >= MaxAttempts)
                {
                    message.DeadLetteredAtUtc = timeProvider.GetUtcNow();
                    logger.LogError(
                        "Outbox event dead-lettered after {AttemptCount} attempts. EventId={EventId} FailureType={FailureType}",
                        message.Attempts, message.EventId, exception.GetType().Name);
                }
                else
                {
                    message.NextAttemptAtUtc = timeProvider.GetUtcNow().AddSeconds(Math.Pow(2, message.Attempts));
                    logger.LogWarning(
                        "Outbox publish failed; retry scheduled. Attempt={AttemptCount} EventId={EventId} FailureType={FailureType}",
                        message.Attempts, message.EventId, exception.GetType().Name);
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
