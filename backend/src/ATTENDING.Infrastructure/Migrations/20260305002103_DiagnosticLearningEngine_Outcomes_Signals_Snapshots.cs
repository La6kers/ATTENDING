using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ATTENDING.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DiagnosticLearningEngine_Outcomes_Signals_Snapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DiagnosticAccuracySnapshots",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecommendationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    GuidelineName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    WindowStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WindowEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WindowDays = table.Column<int>(type: "int", nullable: false),
                    TotalCases = table.Column<int>(type: "int", nullable: false),
                    TruePositives = table.Column<int>(type: "int", nullable: false),
                    FalsePositives = table.Column<int>(type: "int", nullable: false),
                    FalseNegatives = table.Column<int>(type: "int", nullable: false),
                    ProviderAcceptances = table.Column<int>(type: "int", nullable: false),
                    ProviderOverrides = table.Column<int>(type: "int", nullable: false),
                    Sensitivity = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: false),
                    Precision = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: false),
                    AcceptanceRate = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: false),
                    AveragePredictedProbability = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: false),
                    ActualOutcomeRate = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: false),
                    CalibrationAdjustmentFactor = table.Column<decimal>(type: "decimal(5,3)", precision: 5, scale: 3, nullable: true),
                    IsReliable = table.Column<bool>(type: "bit", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ModifiedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiagnosticAccuracySnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DiagnosticOutcomes",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AiFeedbackId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecommendationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AiSuggestedDiagnosis = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AiPreTestProbability = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: true),
                    GuidelineName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ConfirmedDiagnosis = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ConfirmedIcd10Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    AiWasCorrect = table.Column<bool>(type: "bit", nullable: false),
                    ProviderOverrode = table.Column<bool>(type: "bit", nullable: false),
                    ConfirmingTestResult = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ConfirmingTestLoincCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    IsProcessed = table.Column<bool>(type: "bit", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ModifiedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiagnosticOutcomes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LearningSignals",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DiagnosticOutcomeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecommendationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    GuidelineName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AiSuggestedDiagnosis = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AiPreTestProbability = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: true),
                    ConfirmedDiagnosis = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ConfirmedIcd10Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    TruePositive = table.Column<bool>(type: "bit", nullable: false),
                    FalsePositive = table.Column<bool>(type: "bit", nullable: false),
                    FalseNegative = table.Column<bool>(type: "bit", nullable: false),
                    ProviderAccepted = table.Column<bool>(type: "bit", nullable: false),
                    ProviderOverrode = table.Column<bool>(type: "bit", nullable: false),
                    ProviderAccuracyScore = table.Column<int>(type: "int", nullable: true),
                    ConfirmingTestLoincCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ModifiedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearningSignals", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccuracySnapshots_Org_Type_Guideline_WindowEnd",
                schema: "clinical",
                table: "DiagnosticAccuracySnapshots",
                columns: new[] { "OrganizationId", "RecommendationType", "GuidelineName", "WindowEnd" });

            migrationBuilder.CreateIndex(
                name: "IX_DiagnosticAccuracySnapshot_OrganizationId",
                schema: "clinical",
                table: "DiagnosticAccuracySnapshots",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_DiagnosticOutcome_OrganizationId",
                schema: "clinical",
                table: "DiagnosticOutcomes",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_DiagnosticOutcomes_Encounter_Type",
                schema: "clinical",
                table: "DiagnosticOutcomes",
                columns: new[] { "EncounterId", "RecommendationType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DiagnosticOutcomes_Org_CreatedAt",
                schema: "clinical",
                table: "DiagnosticOutcomes",
                columns: new[] { "OrganizationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DiagnosticOutcomes_Unprocessed",
                schema: "clinical",
                table: "DiagnosticOutcomes",
                column: "IsProcessed",
                filter: "[IsProcessed] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_LearningSignal_OrganizationId",
                schema: "clinical",
                table: "LearningSignals",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_LearningSignals_Org_Type_Guideline_Date",
                schema: "clinical",
                table: "LearningSignals",
                columns: new[] { "OrganizationId", "RecommendationType", "GuidelineName", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_LearningSignals_OutcomeId",
                schema: "clinical",
                table: "LearningSignals",
                column: "DiagnosticOutcomeId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiagnosticAccuracySnapshots",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "DiagnosticOutcomes",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "LearningSignals",
                schema: "clinical");
        }
    }
}
