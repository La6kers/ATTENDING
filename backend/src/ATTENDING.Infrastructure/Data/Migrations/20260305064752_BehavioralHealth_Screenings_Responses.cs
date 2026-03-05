using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ATTENDING.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class BehavioralHealth_Screenings_Responses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BehavioralHealthScreenings",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssessmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AdministeredByProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReviewedByProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Instrument = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TotalScore = table.Column<int>(type: "int", nullable: true),
                    ScoreInterpretation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DepressionSeverity = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    AnxietySeverity = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    SuicideIdeationLevel = table.Column<int>(type: "int", nullable: true),
                    SuicideBehaviorType = table.Column<int>(type: "int", nullable: true),
                    HasSuicideRisk = table.Column<bool>(type: "bit", nullable: false),
                    AlcoholRiskLevel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    PtsdScreenResult = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    IsPartTwoProtected = table.Column<bool>(type: "bit", nullable: false),
                    PartTwoConsentGiven = table.Column<bool>(type: "bit", nullable: true),
                    PartTwoConsentTimestamp = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PartTwoConsentCapturedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    RecommendedAction = table.Column<int>(type: "int", nullable: false),
                    ActionTaken = table.Column<int>(type: "int", nullable: true),
                    ProviderActionNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SafetyPlanJson = table.Column<string>(type: "nvarchar(max)", maxLength: 8000, nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextScreeningDue = table.Column<DateTime>(type: "datetime2", nullable: true),
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
                    table.PrimaryKey("PK_BehavioralHealthScreenings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BehavioralHealthScreenings_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalSchema: "clinical",
                        principalTable: "Encounters",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BehavioralHealthScreenings_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScreeningResponses",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScreeningId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemNumber = table.Column<int>(type: "int", nullable: false),
                    QuestionText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ResponseValue = table.Column<int>(type: "int", nullable: false),
                    ResponseText = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AnsweredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
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
                    table.PrimaryKey("PK_ScreeningResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScreeningResponses_BehavioralHealthScreenings_ScreeningId",
                        column: x => x.ScreeningId,
                        principalSchema: "clinical",
                        principalTable: "BehavioralHealthScreenings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BehavioralHealthScreening_OrganizationId",
                schema: "clinical",
                table: "BehavioralHealthScreenings",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_BehavioralHealthScreenings_AssessmentId",
                schema: "clinical",
                table: "BehavioralHealthScreenings",
                column: "AssessmentId",
                filter: "[AssessmentId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_BehavioralHealthScreenings_EncounterId",
                schema: "clinical",
                table: "BehavioralHealthScreenings",
                column: "EncounterId",
                filter: "[EncounterId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_BehavioralHealthScreenings_PatientId",
                schema: "clinical",
                table: "BehavioralHealthScreenings",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_BHScreenings_PatientInstrument",
                schema: "clinical",
                table: "BehavioralHealthScreenings",
                columns: new[] { "PatientId", "Instrument" });

            migrationBuilder.CreateIndex(
                name: "IX_BHScreenings_SafetyDashboard",
                schema: "clinical",
                table: "BehavioralHealthScreenings",
                columns: new[] { "HasSuicideRisk", "Status", "RecommendedAction" });

            migrationBuilder.CreateIndex(
                name: "IX_ScreeningResponse_OrganizationId",
                schema: "clinical",
                table: "ScreeningResponses",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_ScreeningResponses_ScreeningId",
                schema: "clinical",
                table: "ScreeningResponses",
                column: "ScreeningId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScreeningResponses",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "BehavioralHealthScreenings",
                schema: "clinical");
        }
    }
}
