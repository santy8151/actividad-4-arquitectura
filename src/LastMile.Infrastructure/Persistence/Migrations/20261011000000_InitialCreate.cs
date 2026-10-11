using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace LastMile.Infrastructure.Persistence.Migrations;

[DbContext(typeof(LastMileDbContext))]
[Migration("20261011000000_InitialCreate")]
public sealed class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "deliveries",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                Address = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                CourierId = table.Column<Guid>(type: "TEXT", nullable: true),
                Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                Version = table.Column<int>(type: "INTEGER", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_deliveries", x => x.Id));

        migrationBuilder.CreateTable(
            name: "outbox_messages",
            columns: table => new
            {
                EventId = table.Column<Guid>(type: "TEXT", nullable: false),
                EventType = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                Payload = table.Column<string>(type: "TEXT", nullable: false),
                OccurredAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                PublishedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                NextAttemptAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                Attempts = table.Column<int>(type: "INTEGER", nullable: false),
                DeadLetteredAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
            },
            constraints: table => table.PrimaryKey("PK_outbox_messages", x => x.EventId));

        migrationBuilder.CreateIndex(
            name: "IX_outbox_messages_PublishedAtUtc_DeadLetteredAtUtc_NextAttempt~",
            table: "outbox_messages",
            columns: new[] { "PublishedAtUtc", "DeadLetteredAtUtc", "NextAttemptAtUtc" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "deliveries");
        migrationBuilder.DropTable(name: "outbox_messages");
    }
}
