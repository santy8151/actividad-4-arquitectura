using LastMile.Application.Ports;
using LastMile.Application.Observability;
using LastMile.Application.UseCases;
using LastMile.Domain;
using LastMile.Infrastructure.Integrations;
using LastMile.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DeliveryDb") ?? "Data Source=lastmile.db";
builder.Services.AddDbContext<LastMileDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<AssignmentTelemetry>();
builder.Services.AddScoped<AssignCourierUseCase>();
builder.Services.AddScoped<SqliteDeliveryRepository>();
builder.Services.AddScoped<IDeliveryRepository>(services => services.GetRequiredService<SqliteDeliveryRepository>());
builder.Services.AddScoped<IDeliveryReadRepository>(services => services.GetRequiredService<SqliteDeliveryRepository>());
builder.Services.AddScoped<IAssignmentEvents, SqliteAssignmentEvents>();
builder.Services.AddScoped<IAssignmentUnitOfWork, SqliteAssignmentUnitOfWork>();
var courierServiceUrl = builder.Configuration["Integration:CourierManagement:BaseUrl"];
if (TryGetHttpBaseAddress(courierServiceUrl, out var courierBaseAddress))
{
    builder.Services.AddHttpClient<ICourierAvailability, HttpCourierAvailabilityAdapter>(client =>
    {
        client.BaseAddress = courierBaseAddress;
        client.Timeout = TimeSpan.FromSeconds(3);
    });
}
else
{
    builder.Services.AddScoped<ICourierAvailability, DemoCourierAvailabilityAdapter>();
}

var routeServiceUrl = builder.Configuration["Integration:RoutePlanning:BaseUrl"];
if (TryGetHttpBaseAddress(routeServiceUrl, out var routeBaseAddress))
{
    builder.Services.AddHttpClient<IRouteCapacity, HttpRouteCapacityAdapter>(client =>
    {
        client.BaseAddress = routeBaseAddress;
        client.Timeout = TimeSpan.FromSeconds(3);
    });
}
else
{
    builder.Services.AddScoped<IRouteCapacity, DemoRouteCapacityAdapter>();
}

var routeEventsUrl = builder.Configuration["Integration:RouteEvents:BaseUrl"];
if (Uri.TryCreate(routeEventsUrl, UriKind.Absolute, out var routeEventsUri))
{
    builder.Services.AddHttpClient<IRouteEventPublisher, HttpRouteEventPublisher>(client =>
    {
        client.BaseAddress = routeEventsUri;
        client.Timeout = TimeSpan.FromSeconds(3);
    });
}
else
{
    builder.Services.AddSingleton<IRouteEventPublisher, LoggingRouteEventPublisher>();
}

if (builder.Configuration.GetValue("Outbox:DispatchEnabled", true))
    builder.Services.AddHostedService<OutboxDispatcher>();

builder.Logging.Configure(options => options.ActivityTrackingOptions =
    Microsoft.Extensions.Logging.ActivityTrackingOptions.TraceId | Microsoft.Extensions.Logging.ActivityTrackingOptions.SpanId);

var app = builder.Build();
await DatabaseInitializer.InitializeAsync(app.Services);

app.MapGet("/health", async (LastMileDbContext db, CancellationToken cancellationToken) =>
    await db.Database.CanConnectAsync(cancellationToken)
        ? Results.Ok(new { status = "healthy" })
        : Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Persistence unavailable"));

app.MapGet("/api/deliveries/{deliveryId:guid}", async (
    Guid deliveryId,
    IDeliveryReadRepository deliveries,
    CancellationToken cancellationToken) =>
{
    var delivery = await deliveries.GetSnapshotAsync(new DeliveryId(deliveryId), cancellationToken);
    return delivery is null
        ? Results.NotFound(new { code = "DeliveryNotFound" })
        : Results.Ok(new DeliveryResponse(
            delivery.Id.Value,
            delivery.Status.ToString(),
            delivery.CourierId?.Value,
            delivery.Version));
});

app.MapPost("/api/deliveries/{deliveryId:guid}/courier-assignment", async (
    Guid deliveryId,
    AssignCourierRequest request,
    AssignCourierUseCase useCase,
    ILogger<Program> logger,
    HttpContext httpContext,
    CancellationToken cancellationToken) =>
{
    if (request.CourierId == Guid.Empty)
        return Results.BadRequest(new { code = "InvalidCourierId", traceId = httpContext.TraceIdentifier });

    var result = await useCase.ExecuteAsync(new DeliveryId(deliveryId), new CourierId(request.CourierId), cancellationToken);
    if (!result.Succeeded)
    {
        logger.LogWarning(
            "Courier assignment rejected. Failure={Failure} DeliveryId={DeliveryId}",
            result.Failure, deliveryId);
        var status = result.Failure switch
        {
            AssignCourierFailure.DeliveryNotFound => StatusCodes.Status404NotFound,
            AssignCourierFailure.IntegrationUnavailable => StatusCodes.Status503ServiceUnavailable,
            _ => StatusCodes.Status409Conflict
        };
        return Results.Problem(
            statusCode: status,
            title: result.Failure.ToString(),
            extensions: new Dictionary<string, object?>
            {
                ["code"] = result.Failure.ToString(),
                ["traceId"] = httpContext.TraceIdentifier
            });
    }

    logger.LogInformation("Courier assignment committed. DeliveryId={DeliveryId}", deliveryId);
    return Results.Ok(new { deliveryId, courierId = request.CourierId, status = DeliveryStatus.Assigned.ToString() });
});

app.Run();

static bool TryGetHttpBaseAddress(string? value, out Uri address)
{
    if (Uri.TryCreate(value, UriKind.Absolute, out var candidate) &&
        candidate.Scheme is "http" or "https")
    {
        address = new Uri(candidate.ToString().TrimEnd('/') + "/");
        return true;
    }

    address = null!;
    return false;
}

public sealed record AssignCourierRequest(Guid CourierId);
public sealed record DeliveryResponse(Guid DeliveryId, string Status, Guid? CourierId, int Version);
public partial class Program { }
