using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ATTENDING.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AmbientScribe_Recording_Transcript_Note : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "identity",
                table: "Users",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "Referrals",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AlterColumn<int>(
                name: "Sex",
                schema: "clinical",
                table: "Patients",
                type: "int",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(10)",
                oldMaxLength: 10);

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "Patients",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "PatientAssessments",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "MedicationOrders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "MedicalConditions",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "LabResults",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "LabOrders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "ImagingResults",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "ImagingOrders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "Encounters",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "audit",
                table: "AuditLogs",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "AssessmentSymptoms",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "AssessmentResponses",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "Allergies",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                schema: "clinical",
                table: "AiFeedback",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "EmergencyAccessProfiles",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    GForceThreshold = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 4.0m),
                    AutoGrantTimeoutSeconds = table.Column<int>(type: "int", nullable: false),
                    AccessWindowMinutes = table.Column<int>(type: "int", nullable: false),
                    ShowDnrStatus = table.Column<bool>(type: "bit", nullable: false),
                    ShowMedications = table.Column<bool>(type: "bit", nullable: false),
                    ShowAllergies = table.Column<bool>(type: "bit", nullable: false),
                    ShowDiagnoses = table.Column<bool>(type: "bit", nullable: false),
                    ShowEmergencyContacts = table.Column<bool>(type: "bit", nullable: false),
                    ShowImplantedDevices = table.Column<bool>(type: "bit", nullable: false),
                    LastReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastCachedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
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
                    table.PrimaryKey("PK_EmergencyAccessProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmergencyAccessProfiles_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EncounterRecordings",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    RecordingStartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RecordingEndedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TotalAudioSeconds = table.Column<int>(type: "int", nullable: false),
                    AudioBlobContainer = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ConsentGiven = table.Column<bool>(type: "bit", nullable: false),
                    ConsentTimestamp = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConsentCapturedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FailureReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SpeechServiceRegion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
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
                    table.PrimaryKey("PK_EncounterRecordings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EncounterRecordings_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalSchema: "clinical",
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Organizations",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NPI = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    TaxId = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PrimaryContactName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PrimaryContactEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PrimaryContactPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    State = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ZipCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    OnboardingStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    DataMode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    MaxProviderSeats = table.Column<int>(type: "int", nullable: false),
                    FeatureFlagsJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false, defaultValue: "{}"),
                    TimeZone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "America/New_York"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ModifiedBy = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organizations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmergencyAccessLogs",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmergencyAccessProfileId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TriggerType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PeakGForce = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    ConsentMethod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TriggerLatitude = table.Column<decimal>(type: "decimal(10,7)", precision: 10, scale: 7, nullable: true),
                    TriggerLongitude = table.Column<decimal>(type: "decimal(10,7)", precision: 10, scale: 7, nullable: true),
                    ResponderName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    BadgeNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Agency = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ResponderPhotoUri = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HipaaAcknowledged = table.Column<bool>(type: "bit", nullable: false),
                    AccessGrantedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AccessExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AccessEndedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SectionsViewed = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AccessDeviceInfo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
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
                    table.PrimaryKey("PK_EmergencyAccessLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmergencyAccessLogs_EmergencyAccessProfiles_EmergencyAccessProfileId",
                        column: x => x.EmergencyAccessProfileId,
                        principalSchema: "clinical",
                        principalTable: "EmergencyAccessProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AmbientNotes",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Subjective = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: false),
                    Objective = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: false),
                    Assessment = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: false),
                    Plan = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: false),
                    ExtractedDiagnosisCodes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ExtractedMedications = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FollowUpInstructions = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PromptTokens = table.Column<int>(type: "int", nullable: false),
                    SignedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SignedByProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EditCount = table.Column<int>(type: "int", nullable: false),
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
                    table.PrimaryKey("PK_AmbientNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AmbientNotes_EncounterRecordings_RecordingId",
                        column: x => x.RecordingId,
                        principalSchema: "clinical",
                        principalTable: "EncounterRecordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TranscriptSegments",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecordingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Speaker = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SpeakerLabel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    OffsetMs = table.Column<int>(type: "int", nullable: false),
                    DurationMs = table.Column<int>(type: "int", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: false),
                    Confidence = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    WasEdited = table.Column<bool>(type: "bit", nullable: false),
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
                    table.PrimaryKey("PK_TranscriptSegments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TranscriptSegments_EncounterRecordings_RecordingId",
                        column: x => x.RecordingId,
                        principalSchema: "clinical",
                        principalTable: "EncounterRecordings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EhrConnectorConfigs",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Vendor = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ClientId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ClientSecret = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    FhirBaseUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EhrTenantId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    RedirectUri = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsVerified = table.Column<bool>(type: "bit", nullable: false),
                    VerificationDetails = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    LastVerifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastError = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EhrConnectorConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EhrConnectorConfigs_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalSchema: "clinical",
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_User_OrganizationId",
                schema: "identity",
                table: "Users",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Referral_OrganizationId",
                schema: "clinical",
                table: "Referrals",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Patient_OrganizationId",
                schema: "clinical",
                table: "Patients",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientAssessment_OrganizationId",
                schema: "clinical",
                table: "PatientAssessments",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationOrder_OrganizationId",
                schema: "clinical",
                table: "MedicationOrders",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalCondition_OrganizationId",
                schema: "clinical",
                table: "MedicalConditions",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_LabResult_OrganizationId",
                schema: "clinical",
                table: "LabResults",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_LabOrder_OrganizationId",
                schema: "clinical",
                table: "LabOrders",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingResult_OrganizationId",
                schema: "clinical",
                table: "ImagingResults",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingOrder_OrganizationId",
                schema: "clinical",
                table: "ImagingOrders",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounter_OrganizationId",
                schema: "clinical",
                table: "Encounters",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentSymptom_OrganizationId",
                schema: "clinical",
                table: "AssessmentSymptoms",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentResponse_OrganizationId",
                schema: "clinical",
                table: "AssessmentResponses",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Allergy_OrganizationId",
                schema: "clinical",
                table: "Allergies",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_AiFeedback_OrganizationId",
                schema: "clinical",
                table: "AiFeedback",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_AmbientNote_OrganizationId",
                schema: "clinical",
                table: "AmbientNotes",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_AmbientNotes_EncounterId",
                schema: "clinical",
                table: "AmbientNotes",
                column: "EncounterId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AmbientNotes_Org_Status",
                schema: "clinical",
                table: "AmbientNotes",
                columns: new[] { "OrganizationId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AmbientNotes_RecordingId",
                schema: "clinical",
                table: "AmbientNotes",
                column: "RecordingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AmbientNotes_SignedByProviderId",
                schema: "clinical",
                table: "AmbientNotes",
                column: "SignedByProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_AmbientNotes_Status",
                schema: "clinical",
                table: "AmbientNotes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_EhrConnectors_OrganizationId",
                schema: "clinical",
                table: "EhrConnectorConfigs",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_EhrConnectors_OrgVendor",
                schema: "clinical",
                table: "EhrConnectorConfigs",
                columns: new[] { "OrganizationId", "Vendor" });

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyAccessLog_OrganizationId",
                schema: "clinical",
                table: "EmergencyAccessLogs",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyAccessLogs_EmergencyAccessProfileId",
                schema: "clinical",
                table: "EmergencyAccessLogs",
                column: "EmergencyAccessProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyAccessLogs_PatientId",
                schema: "clinical",
                table: "EmergencyAccessLogs",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyAccessLogs_PatientId_AccessGrantedAt",
                schema: "clinical",
                table: "EmergencyAccessLogs",
                columns: new[] { "PatientId", "AccessGrantedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyAccessProfile_OrganizationId",
                schema: "clinical",
                table: "EmergencyAccessProfiles",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_EmergencyAccessProfiles_PatientId",
                schema: "clinical",
                table: "EmergencyAccessProfiles",
                column: "PatientId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EncounterRecording_OrganizationId",
                schema: "clinical",
                table: "EncounterRecordings",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_EncounterRecordings_EncounterId",
                schema: "clinical",
                table: "EncounterRecordings",
                column: "EncounterId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EncounterRecordings_Org_Status",
                schema: "clinical",
                table: "EncounterRecordings",
                columns: new[] { "OrganizationId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_EncounterRecordings_ProviderId",
                schema: "clinical",
                table: "EncounterRecordings",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_EncounterRecordings_Status",
                schema: "clinical",
                table: "EncounterRecordings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_OnboardingStatus",
                schema: "clinical",
                table: "Organizations",
                column: "OnboardingStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Slug",
                schema: "clinical",
                table: "Organizations",
                column: "Slug",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_TranscriptSegment_OrganizationId",
                schema: "clinical",
                table: "TranscriptSegments",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_TranscriptSegments_RecordingId_OffsetMs",
                schema: "clinical",
                table: "TranscriptSegments",
                columns: new[] { "RecordingId", "OffsetMs" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AmbientNotes",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "EhrConnectorConfigs",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "EmergencyAccessLogs",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "TranscriptSegments",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "Organizations",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "EmergencyAccessProfiles",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "EncounterRecordings",
                schema: "clinical");

            migrationBuilder.DropIndex(
                name: "IX_User_OrganizationId",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Referral_OrganizationId",
                schema: "clinical",
                table: "Referrals");

            migrationBuilder.DropIndex(
                name: "IX_Patient_OrganizationId",
                schema: "clinical",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_PatientAssessment_OrganizationId",
                schema: "clinical",
                table: "PatientAssessments");

            migrationBuilder.DropIndex(
                name: "IX_MedicationOrder_OrganizationId",
                schema: "clinical",
                table: "MedicationOrders");

            migrationBuilder.DropIndex(
                name: "IX_MedicalCondition_OrganizationId",
                schema: "clinical",
                table: "MedicalConditions");

            migrationBuilder.DropIndex(
                name: "IX_LabResult_OrganizationId",
                schema: "clinical",
                table: "LabResults");

            migrationBuilder.DropIndex(
                name: "IX_LabOrder_OrganizationId",
                schema: "clinical",
                table: "LabOrders");

            migrationBuilder.DropIndex(
                name: "IX_ImagingResult_OrganizationId",
                schema: "clinical",
                table: "ImagingResults");

            migrationBuilder.DropIndex(
                name: "IX_ImagingOrder_OrganizationId",
                schema: "clinical",
                table: "ImagingOrders");

            migrationBuilder.DropIndex(
                name: "IX_Encounter_OrganizationId",
                schema: "clinical",
                table: "Encounters");

            migrationBuilder.DropIndex(
                name: "IX_AssessmentSymptom_OrganizationId",
                schema: "clinical",
                table: "AssessmentSymptoms");

            migrationBuilder.DropIndex(
                name: "IX_AssessmentResponse_OrganizationId",
                schema: "clinical",
                table: "AssessmentResponses");

            migrationBuilder.DropIndex(
                name: "IX_Allergy_OrganizationId",
                schema: "clinical",
                table: "Allergies");

            migrationBuilder.DropIndex(
                name: "IX_AiFeedback_OrganizationId",
                schema: "clinical",
                table: "AiFeedback");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "PatientAssessments");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "MedicationOrders");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "MedicalConditions");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "LabOrders");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "ImagingResults");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "ImagingOrders");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "Encounters");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "audit",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "AssessmentSymptoms");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "AssessmentResponses");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "Allergies");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                schema: "clinical",
                table: "AiFeedback");

            migrationBuilder.AlterColumn<string>(
                name: "Sex",
                schema: "clinical",
                table: "Patients",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldMaxLength: 10);
        }
    }
}
