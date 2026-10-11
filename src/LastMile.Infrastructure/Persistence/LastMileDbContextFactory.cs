using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LastMile.Infrastructure.Persistence;

public sealed class LastMileDbContextFactory : IDesignTimeDbContextFactory<LastMileDbContext>
{
    public LastMileDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<LastMileDbContext>()
            .UseSqlite("Data Source=lastmile-design-time.db")
            .Options;
        return new LastMileDbContext(options);
    }
}
