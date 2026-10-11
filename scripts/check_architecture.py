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
allowed = {
    "Domain": set(),
    "Application": {"Domain"},
    "Infrastructure": {"Application", "Domain"},
    "Api": {"Application", "Domain", "Infrastructure"},
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
    invalid = actual - allowed[layer]
    print(f"{layer}: references={sorted(actual)} allowed={sorted(allowed[layer])}")
    if invalid:
        failed = True
        if invalid:
            print(f"  ERROR: references to forbidden layer(s): {sorted(invalid)}")
if failed:
    sys.exit(1)
print("Architecture fitness function passed.")
