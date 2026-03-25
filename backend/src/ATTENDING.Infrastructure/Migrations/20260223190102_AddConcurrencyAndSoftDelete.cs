using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ATTENDING.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddConcurrencyAndSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "identity",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "identity",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "identity",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "identity",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "identity",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "identity",
                table: "Users",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "Referrals",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "Referrals",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "Referrals",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "Referrals",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "Referrals",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReferredBy",
                schema: "clinical",
                table: "Referrals",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "Referrals",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "Patients",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "Patients",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "Patients",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "Patients",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "Patients",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "Patients",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "PatientAssessments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "PatientAssessments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "PatientAssessments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "PatientAssessments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "PatientAssessments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "PatientAssessments",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "MedicationOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "MedicationOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "MedicationOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "MedicationOrders",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "MedicationOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OrderedBy",
                schema: "clinical",
                table: "MedicationOrders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "MedicationOrders",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "MedicalConditions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "MedicalConditions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "MedicalConditions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "MedicalConditions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "MedicalConditions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "MedicalConditions",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "LabResults",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "LabResults",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "LabResults",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "LabResults",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "LabResults",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "LabResults",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AlterColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "LabOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "LabOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "LabOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "LabOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "LabOrders",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "LastModifiedBy",
                schema: "clinical",
                table: "LabOrders",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OrderedBy",
                schema: "clinical",
                table: "LabOrders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "LabOrders",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "ImagingResults",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "ImagingResults",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "ImagingResults",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "ImagingResults",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "ImagingResults",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "ImagingResults",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "ImagingOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "ImagingOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "ImagingOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "ImagingOrders",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "ImagingOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OrderedBy",
                schema: "clinical",
                table: "ImagingOrders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "ImagingOrders",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "Encounters",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "Encounters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "Encounters",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "Encounters",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "Encounters",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "Encounters",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "AssessmentSymptoms",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "AssessmentSymptoms",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "AssessmentSymptoms",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "AssessmentSymptoms",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "AssessmentSymptoms",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "AssessmentSymptoms",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "AssessmentResponses",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "AssessmentResponses",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "AssessmentResponses",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "AssessmentResponses",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "AssessmentResponses",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "AssessmentResponses",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "clinical",
                table: "Allergies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "clinical",
                table: "Allergies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                schema: "clinical",
                table: "Allergies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "clinical",
                table: "Allergies",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "Allergies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "clinical",
                table: "Allergies",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateTable(
                name: "AiFeedback",
                schema: "clinical",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EncounterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RecommendationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RequestId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Rating = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    AccuracyScore = table.Column<int>(type: "int", nullable: true),
                    SelectedDiagnosis = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Comment = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ModelVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
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
                    table.PrimaryKey("PK_AiFeedback", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiFeedback_CreatedAt",
                schema: "clinical",
                table: "AiFeedback",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiFeedback_ProviderId",
                schema: "clinical",
                table: "AiFeedback",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_AiFeedback_RecommendationType",
                schema: "clinical",
                table: "AiFeedback",
                column: "RecommendationType");

            migrationBuilder.CreateIndex(
                name: "IX_AiFeedback_RequestId",
                schema: "clinical",
                table: "AiFeedback",
                column: "RequestId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiFeedback",
                schema: "clinical");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "identity",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "ReferredBy",
                schema: "clinical",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "clinical",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "clinical",
                table: "PatientAssessments");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "PatientAssessments");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "PatientAssessments");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "PatientAssessments");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "PatientAssessments");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "PatientAssessments");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "MedicationOrders");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "MedicationOrders");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "MedicationOrders");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "MedicationOrders");

            migrationBuilder.DropColumn(
                name: "OrderedBy",
                schema: "clinical",
                table: "MedicationOrders");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "MedicationOrders");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "clinical",
                table: "MedicalConditions");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "MedicalConditions");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "MedicalConditions");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "MedicalConditions");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "MedicalConditions");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "MedicalConditions");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "clinical",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "LabOrders");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "LabOrders");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "LabOrders");

            migrationBuilder.DropColumn(
                name: "LastModifiedBy",
                schema: "clinical",
                table: "LabOrders");

            migrationBuilder.DropColumn(
                name: "OrderedBy",
                schema: "clinical",
                table: "LabOrders");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "LabOrders");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "clinical",
                table: "ImagingResults");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "ImagingResults");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "ImagingResults");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "ImagingResults");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "ImagingResults");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "ImagingResults");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "ImagingOrders");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "ImagingOrders");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "ImagingOrders");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "ImagingOrders");

            migrationBuilder.DropColumn(
                name: "OrderedBy",
                schema: "clinical",
                table: "ImagingOrders");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "ImagingOrders");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "clinical",
                table: "Encounters");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "Encounters");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "Encounters");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "Encounters");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "Encounters");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "Encounters");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "clinical",
                table: "AssessmentSymptoms");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "AssessmentSymptoms");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "AssessmentSymptoms");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "AssessmentSymptoms");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "AssessmentSymptoms");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "AssessmentSymptoms");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "clinical",
                table: "AssessmentResponses");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "AssessmentResponses");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "AssessmentResponses");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "AssessmentResponses");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "AssessmentResponses");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "AssessmentResponses");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "clinical",
                table: "Allergies");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "clinical",
                table: "Allergies");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "clinical",
                table: "Allergies");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "clinical",
                table: "Allergies");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "clinical",
                table: "Allergies");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "clinical",
                table: "Allergies");

            migrationBuilder.AlterColumn<Guid>(
                name: "CreatedBy",
                schema: "clinical",
                table: "Referrals",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "CreatedBy",
                schema: "clinical",
                table: "MedicationOrders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ModifiedBy",
                schema: "clinical",
                table: "LabOrders",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "CreatedBy",
                schema: "clinical",
                table: "LabOrders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "CreatedBy",
                schema: "clinical",
                table: "ImagingOrders",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);
        }
    }
}
