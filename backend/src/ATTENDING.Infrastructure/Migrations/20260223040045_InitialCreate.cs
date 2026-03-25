using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ATTENDING.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "clinical");

            migrationBuilder.EnsureSchema(
                name: "audit");

            migrationBuilder.EnsureSchema(
                name: "identity");

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                schema: "audit",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    UserRole = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RequestPath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RequestMethod = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    StatusCode = table.Column<int>(type: "int", nullable: true),
                    Details = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    OldValues = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    NewValues = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Patients",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MRN = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Sex = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    AddressLine1 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AddressLine2 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    State = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ZipCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PrimaryLanguage = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "English"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                schema: "identity",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    NPI = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    Specialty = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AzureAdObjectId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Allergies",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Allergen = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Reaction = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Severity = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Allergies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Allergies_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MedicalConditions",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    OnsetDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicalConditions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MedicalConditions_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Encounters",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncounterNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ChiefComplaint = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CheckedInAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Encounters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Encounters_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Encounters_Users_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "identity",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImagingOrders",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderingProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudyCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StudyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Modality = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BodyPart = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Laterality = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    WithContrast = table.Column<bool>(type: "bit", nullable: false),
                    CptCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ClinicalIndication = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DiagnosisCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    EstimatedRadiationDose = table.Column<decimal>(type: "decimal(10,4)", precision: 10, scale: 4, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OrderedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImagingOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImagingOrders_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalSchema: "clinical",
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImagingOrders_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImagingOrders_Users_OrderingProviderId",
                        column: x => x.OrderingProviderId,
                        principalSchema: "identity",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LabOrders",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderingProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TestName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CptCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CptDescription = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CptBasePrice = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    LoincCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ClinicalIndication = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DiagnosisCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    DiagnosisDescription = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RequiresFasting = table.Column<bool>(type: "bit", nullable: false),
                    IsStatFromRedFlag = table.Column<bool>(type: "bit", nullable: false),
                    RedFlagReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OrderedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResultedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModifiedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabOrders_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalSchema: "clinical",
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LabOrders_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LabOrders_Users_OrderingProviderId",
                        column: x => x.OrderingProviderId,
                        principalSchema: "identity",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MedicationOrders",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderingProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MedicationCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    MedicationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    GenericName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Strength = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Form = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Route = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Frequency = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Dosage = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Refills = table.Column<int>(type: "int", nullable: false),
                    Instructions = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ClinicalIndication = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DiagnosisCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    IsControlledSubstance = table.Column<bool>(type: "bit", nullable: false),
                    DeaSchedule = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    HasBlackBoxWarning = table.Column<bool>(type: "bit", nullable: false),
                    PharmacyId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PharmacyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OrderedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DispensedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DiscontinuedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DiscontinuedReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicationOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MedicationOrders_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalSchema: "clinical",
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MedicationOrders_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MedicationOrders_Users_OrderingProviderId",
                        column: x => x.OrderingProviderId,
                        principalSchema: "identity",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PatientAssessments",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssessmentNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedByProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ChiefComplaint = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CurrentPhase = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TriageLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PainSeverity = table.Column<int>(type: "int", nullable: true),
                    HpiOnset = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HpiLocation = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HpiDuration = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HpiCharacter = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HpiAggravating = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HpiRelieving = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HpiTiming = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HpiSeverity = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HpiContext = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    HpiAssociatedSymptoms = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReviewOfSystemsJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    MedicalHistoryJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    MedicationsJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    AllergiesJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    SocialHistoryJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    HasRedFlags = table.Column<bool>(type: "bit", nullable: false),
                    RedFlagsJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    RiskFactorsJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    DifferentialDiagnosisJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    RecommendedWorkupJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    VoiceTranscript = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    ImageUrlsJson = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsEmergency = table.Column<bool>(type: "bit", nullable: false),
                    EmergencyReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientAssessments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientAssessments_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalSchema: "clinical",
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PatientAssessments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PatientAssessments_Users_ReviewedByProviderId",
                        column: x => x.ReviewedByProviderId,
                        principalSchema: "identity",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Referrals",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferralNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferringProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Specialty = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Urgency = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ClinicalQuestion = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    DiagnosisCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ReasonForReferral = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ReferredToProviderId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReferredToProviderName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ReferredToFacility = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ReferredToPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ReferredToFax = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    InsuranceAuthNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    AuthExpirationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReferredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConsultNotes = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Referrals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Referrals_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalSchema: "clinical",
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Referrals_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "clinical",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Referrals_Users_ReferringProviderId",
                        column: x => x.ReferringProviderId,
                        principalSchema: "identity",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImagingResults",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ImagingOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Findings = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: false),
                    Impression = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: false),
                    HasCriticalFindings = table.Column<bool>(type: "bit", nullable: false),
                    CriticalFindingsDescription = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReadingRadiologist = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImagingResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImagingResults_ImagingOrders_ImagingOrderId",
                        column: x => x.ImagingOrderId,
                        principalSchema: "clinical",
                        principalTable: "ImagingOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LabResults",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LabOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReferenceRangeLow = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    ReferenceRangeHigh = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    ReferenceRangeText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Interpretation = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    IsCritical = table.Column<bool>(type: "bit", nullable: false),
                    CriticalNotifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CriticalNotifiedTo = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PerformingLab = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ResultedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResultedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Comments = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabResults_LabOrders_LabOrderId",
                        column: x => x.LabOrderId,
                        principalSchema: "clinical",
                        principalTable: "LabOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AssessmentResponses",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssessmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Phase = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Question = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Response = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: false),
                    ExtractedEntities = table.Column<string>(type: "nvarchar(max)", maxLength: 500, nullable: true),
                    RespondedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssessmentResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssessmentResponses_PatientAssessments_AssessmentId",
                        column: x => x.AssessmentId,
                        principalSchema: "clinical",
                        principalTable: "PatientAssessments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AssessmentSymptoms",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssessmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SymptomCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SymptomName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    BodySystem = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Severity = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Duration = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsPresent = table.Column<bool>(type: "bit", nullable: false),
                    AdditionalNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssessmentSymptoms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssessmentSymptoms_PatientAssessments_AssessmentId",
                        column: x => x.AssessmentId,
                        principalSchema: "clinical",
                        principalTable: "PatientAssessments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Allergies_PatientId",
                schema: "clinical",
                table: "Allergies",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Allergies_PatientId_Allergen",
                schema: "clinical",
                table: "Allergies",
                columns: new[] { "PatientId", "Allergen" });

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentResponses_Assessment_Phase",
                schema: "clinical",
                table: "AssessmentResponses",
                columns: new[] { "AssessmentId", "Phase" });

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentResponses_AssessmentId",
                schema: "clinical",
                table: "AssessmentResponses",
                column: "AssessmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentSymptoms_Assessment_Code",
                schema: "clinical",
                table: "AssessmentSymptoms",
                columns: new[] { "AssessmentId", "SymptomCode" });

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentSymptoms_AssessmentId",
                schema: "clinical",
                table: "AssessmentSymptoms",
                column: "AssessmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Action",
                schema: "audit",
                table: "AuditLogs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Entity",
                schema: "audit",
                table: "AuditLogs",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_PatientId",
                schema: "audit",
                table: "AuditLogs",
                column: "PatientId",
                filter: "[PatientId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Timestamp",
                schema: "audit",
                table: "AuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Timestamp_PatientId",
                schema: "audit",
                table: "AuditLogs",
                columns: new[] { "Timestamp", "PatientId" },
                filter: "[PatientId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Timestamp_UserId",
                schema: "audit",
                table: "AuditLogs",
                columns: new[] { "Timestamp", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                schema: "audit",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_Number",
                schema: "clinical",
                table: "Encounters",
                column: "EncounterNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_PatientId",
                schema: "clinical",
                table: "Encounters",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_ProviderId",
                schema: "clinical",
                table: "Encounters",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_ScheduledAt",
                schema: "clinical",
                table: "Encounters",
                column: "ScheduledAt");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_Status",
                schema: "clinical",
                table: "Encounters",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingOrders_EncounterId",
                schema: "clinical",
                table: "ImagingOrders",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingOrders_Modality",
                schema: "clinical",
                table: "ImagingOrders",
                column: "Modality");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingOrders_OrderingProviderId",
                schema: "clinical",
                table: "ImagingOrders",
                column: "OrderingProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingOrders_OrderNumber",
                schema: "clinical",
                table: "ImagingOrders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImagingOrders_PatientId",
                schema: "clinical",
                table: "ImagingOrders",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingOrders_Status",
                schema: "clinical",
                table: "ImagingOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingResults_Critical",
                schema: "clinical",
                table: "ImagingResults",
                column: "HasCriticalFindings",
                filter: "[HasCriticalFindings] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingResults_ImagingOrderId",
                schema: "clinical",
                table: "ImagingResults",
                column: "ImagingOrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabOrders_EncounterId",
                schema: "clinical",
                table: "LabOrders",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_LabOrders_OrderedAt",
                schema: "clinical",
                table: "LabOrders",
                column: "OrderedAt");

            migrationBuilder.CreateIndex(
                name: "IX_LabOrders_OrderingProviderId",
                schema: "clinical",
                table: "LabOrders",
                column: "OrderingProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_LabOrders_OrderNumber",
                schema: "clinical",
                table: "LabOrders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabOrders_PatientId",
                schema: "clinical",
                table: "LabOrders",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_LabOrders_PatientId_Status",
                schema: "clinical",
                table: "LabOrders",
                columns: new[] { "PatientId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_LabOrders_Stat",
                schema: "clinical",
                table: "LabOrders",
                column: "Priority",
                filter: "[Priority] = 'Stat'");

            migrationBuilder.CreateIndex(
                name: "IX_LabOrders_Status",
                schema: "clinical",
                table: "LabOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LabResults_Critical",
                schema: "clinical",
                table: "LabResults",
                column: "IsCritical",
                filter: "[IsCritical] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_LabResults_LabOrderId",
                schema: "clinical",
                table: "LabResults",
                column: "LabOrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MedicalConditions_Code",
                schema: "clinical",
                table: "MedicalConditions",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_MedicalConditions_PatientId",
                schema: "clinical",
                table: "MedicalConditions",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationOrders_Controlled",
                schema: "clinical",
                table: "MedicationOrders",
                column: "IsControlledSubstance",
                filter: "[IsControlledSubstance] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationOrders_EncounterId",
                schema: "clinical",
                table: "MedicationOrders",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationOrders_OrderingProviderId",
                schema: "clinical",
                table: "MedicationOrders",
                column: "OrderingProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationOrders_OrderNumber",
                schema: "clinical",
                table: "MedicationOrders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MedicationOrders_PatientId",
                schema: "clinical",
                table: "MedicationOrders",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationOrders_PatientId_Status",
                schema: "clinical",
                table: "MedicationOrders",
                columns: new[] { "PatientId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_MedicationOrders_Status",
                schema: "clinical",
                table: "MedicationOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_AssessmentNumber",
                schema: "clinical",
                table: "PatientAssessments",
                column: "AssessmentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_Emergency",
                schema: "clinical",
                table: "PatientAssessments",
                column: "IsEmergency",
                filter: "[IsEmergency] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_PatientId",
                schema: "clinical",
                table: "PatientAssessments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_Phase",
                schema: "clinical",
                table: "PatientAssessments",
                column: "CurrentPhase");

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_Phase_RedFlags",
                schema: "clinical",
                table: "PatientAssessments",
                columns: new[] { "CurrentPhase", "HasRedFlags" });

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_RedFlags",
                schema: "clinical",
                table: "PatientAssessments",
                column: "HasRedFlags",
                filter: "[HasRedFlags] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_PatientAssessments_EncounterId",
                schema: "clinical",
                table: "PatientAssessments",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientAssessments_ReviewedByProviderId",
                schema: "clinical",
                table: "PatientAssessments",
                column: "ReviewedByProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_DOB",
                schema: "clinical",
                table: "Patients",
                column: "DateOfBirth");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_MRN",
                schema: "clinical",
                table: "Patients",
                column: "MRN",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Name",
                schema: "clinical",
                table: "Patients",
                columns: new[] { "LastName", "FirstName" });

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_EncounterId",
                schema: "clinical",
                table: "Referrals",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_PatientId",
                schema: "clinical",
                table: "Referrals",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferralNumber",
                schema: "clinical",
                table: "Referrals",
                column: "ReferralNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReferringProviderId",
                schema: "clinical",
                table: "Referrals",
                column: "ReferringProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_Specialty",
                schema: "clinical",
                table: "Referrals",
                column: "Specialty");

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_Status",
                schema: "clinical",
                table: "Referrals",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Users_AzureAdObjectId",
                schema: "identity",
                table: "Users",
                column: "AzureAdObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                schema: "identity",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_NPI",
                schema: "identity",
                table: "Users",
                column: "NPI",
                unique: true,
                filter: "[NPI] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Role",
                schema: "identity",
                table: "Users",
                column: "Role");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Allergies",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "AssessmentResponses",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "AssessmentSymptoms",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "AuditLogs",
                schema: "audit");

            migrationBuilder.DropTable(
                name: "ImagingResults",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "LabResults",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "MedicalConditions",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "MedicationOrders",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "Referrals",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "PatientAssessments",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "ImagingOrders",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "LabOrders",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "Encounters",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "Patients",
                schema: "clinical");

            migrationBuilder.DropTable(
                name: "Users",
                schema: "identity");
        }
    }
}
