using System.Diagnostics;
using System.Diagnostics.Metrics;
using LastMile.Application.UseCases;

namespace LastMile.Application.Observability;

public sealed class AssignmentTelemetry : IDisposable
{
    public const string InstrumentationName = "LastMile.Assignments";
    public static readonly ActivitySource ActivitySource = new(InstrumentationName);

    private readonly Meter _meter = new(InstrumentationName, "1.0.0");
    private readonly Counter<long> _results;
    private readonly Histogram<double> _durationMs;

    public AssignmentTelemetry()
    {
        _results = _meter.CreateCounter<long>("lastmile.assignment.results", "assignments");
        _durationMs = _meter.CreateHistogram<double>("lastmile.assignment.duration", "ms");
    }

    public void Record(AssignCourierResult result, double elapsedMilliseconds)
    {
        var outcome = result.Failure.ToString();
        _results.Add(1, new KeyValuePair<string, object?>("outcome", outcome));
        _durationMs.Record(elapsedMilliseconds, new KeyValuePair<string, object?>("outcome", outcome));
    }

    public void Dispose()
    {
        _meter.Dispose();
    }
}
