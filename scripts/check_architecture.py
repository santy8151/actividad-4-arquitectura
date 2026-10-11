import pathlib
import sys
import xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parents[1]
projects = {
    "Domain": root / "src/LastMile.Domain/LastMile.Domain.csproj",
    "Application": root / "src/LastMile.Application/LastMile.Application.csproj",
    "Infrastructure": root / "src/LastMile.Infrastructure/LastMile.Infrastructure.csproj",
    "Api": root / "src/LastMile.Api/LastMile.Api.csproj",
}
# Exact project graph for the Onion: all runtime dependencies point inward.
expected = {
    "Domain": set(),
    "Application": {"Domain"},
    "Infrastructure": {"Application", "Domain"},
    "Api": {"Application", "Infrastructure", "Domain"},  # Outer composition and HTTP layer
}
failed = False
for layer, project in projects.items():
    tree = ET.parse(project)
    actual = set()
    for reference in tree.iter("ProjectReference"):
        target = pathlib.Path(reference.attrib["Include"].replace("\\", "/")).stem
        target = target.removeprefix("LastMile.")
        if target in projects:
            actual.add(target)
    print(f"{layer}: references={sorted(actual)}")
    if actual != expected[layer]:
        failed = True
        forbidden = actual - expected[layer]
        missing = expected[layer] - actual
        if forbidden:
            print(f"  ERROR: forbidden outward reference(s): {sorted(forbidden)}")
        if missing:
            print(f"  ERROR: expected inner-layer reference(s) missing: {sorted(missing)}")
if failed:
    sys.exit(1)
print("Onion architecture fitness function passed.")
