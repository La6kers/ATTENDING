using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ATTENDING.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTenantIsolation : Migration
    {
        // All BaseEntity-derived tables that need OrganizationId
        private static readonly (string Table, string Schema)[] Tables = new[]
        {
            ("Users",              "identity"),
            ("Patients",           "clinical"),
            ("Encounters",         "clinical"),
            ("Allergies",          "clinical"),
            ("MedicalConditions",  "clinical"),
            ("LabOrders",          "clinical"),
            ("LabResults",         "clinical"),
            ("ImagingOrders",      "clinical"),
            ("ImagingResults",     "clinical"),
            ("MedicationOrders",   "clinical"),
            ("Referrals",          "clinical"),
            ("Assessments",        "clinical"),
            ("AssessmentSymptoms", "clinical"),
            ("AssessmentResponses","clinical"),
            ("AiFeedback",         "clinical"),
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var (table, schema) in Tables)
            {
                // Add the column with a default of Guid.Empty for existing rows.
                // New rows will have OrganizationId set by AuditSaveChangesInterceptor.
                migrationBuilder.AddColumn<Guid>(
                    name: "OrganizationId",
                    schema: schema,
                    table: table,
                    type: "uniqueidentifier",
                    nullable: false,
                    defaultValue: new Guid("00000000-0000-0000-0000-000000000001"));

                // Index for tenant-scoped queries — almost every query benefits from this
                migrationBuilder.CreateIndex(
                    name: $"IX_{table}_OrganizationId",
                    schema: schema,
                    table: table,
                    column: "OrganizationId");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (table, schema) in Tables)
            {
                migrationBuilder.DropIndex(
                    name: $"IX_{table}_OrganizationId",
                    schema: schema,
                    table: table);

                migrationBuilder.DropColumn(
                    name: "OrganizationId",
                    schema: schema,
                    table: table);
            }
        }
    }
}
