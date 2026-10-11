namespace LastMile.Infrastructure.Persistence;

public sealed class OutboxRecord
{
    public Guid EventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; set; }
    public DateTimeOffset? PublishedAtUtc { get; set; }
    public DateTimeOffset NextAttemptAtUtc { get; set; }
    public int Attempts { get; set; }
    public DateTimeOffset? DeadLetteredAtUtc { get; set; }
}
