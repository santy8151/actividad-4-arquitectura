namespace LastMile.Application;

public sealed class IntegrationUnavailableException(string integrationName, Exception? innerException = null)
    : Exception($"The {integrationName} integration is unavailable.", innerException)
{
    public string IntegrationName { get; } = integrationName;
}
