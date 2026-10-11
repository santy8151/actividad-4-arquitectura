using System.Net;
using System.Net.Http.Json;
using LastMile.Application;
using LastMile.Application.Ports;
using LastMile.Domain;

namespace LastMile.Infrastructure.Integrations;

public sealed class HttpCourierAvailabilityAdapter(HttpClient client) : ICourierAvailability
{
    public async Task<bool> IsAvailableAsync(CourierId courierId, CancellationToken cancellationToken)
    {
        var response = await HttpGetWithRetry.SendAsync<AvailabilityResponse>(
            client, $"couriers/{courierId.Value}/availability", "courier-management", cancellationToken);
        return response.Available;
    }

    private sealed record AvailabilityResponse(bool Available);
}

public sealed class HttpRouteCapacityAdapter(HttpClient client) : IRouteCapacity
{
    public async Task<bool> CanAcceptAsync(DeliveryId deliveryId, CancellationToken cancellationToken)
    {
        var response = await HttpGetWithRetry.SendAsync<RouteCapacityResponse>(
            client, $"routes/capacity?deliveryId={deliveryId.Value}", "route-planning", cancellationToken);
        return response.CanAccept;
    }

    private sealed record RouteCapacityResponse(bool CanAccept);
}

internal static class HttpGetWithRetry
{
    public static async Task<T> SendAsync<T>(
        HttpClient client,
        string path,
        string integrationName,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var response = await client.GetAsync(path, cancellationToken);
                if (IsTransient(response.StatusCode) && attempt < maxAttempts)
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(150 * attempt), cancellationToken);
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                    throw new IntegrationUnavailableException(integrationName);

                try
                {
                    return await response.Content.ReadFromJsonAsync<T>(cancellationToken: cancellationToken)
                        ?? throw new IntegrationUnavailableException(integrationName);
                }
                catch (System.Text.Json.JsonException exception)
                {
                    throw new IntegrationUnavailableException(integrationName, exception);
                }
            }
            catch (HttpRequestException) when (attempt < maxAttempts)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(150 * attempt), cancellationToken);
            }
            catch (TaskCanceledException exception) when (!cancellationToken.IsCancellationRequested)
            {
                if (attempt == maxAttempts)
                    throw new IntegrationUnavailableException(integrationName, exception);
                await Task.Delay(TimeSpan.FromMilliseconds(150 * attempt), cancellationToken);
            }
            catch (HttpRequestException exception)
            {
                throw new IntegrationUnavailableException(integrationName, exception);
            }
        }

        throw new IntegrationUnavailableException(integrationName);
    }

    private static bool IsTransient(HttpStatusCode statusCode) =>
        statusCode is HttpStatusCode.RequestTimeout or HttpStatusCode.TooManyRequests || (int)statusCode >= 500;
}
