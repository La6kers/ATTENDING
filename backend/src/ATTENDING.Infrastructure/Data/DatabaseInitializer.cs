using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ATTENDING.Domain.Entities;
using ATTENDING.Domain.Enums;

namespace ATTENDING.Infrastructure.Data;

/// <summary>
/// Initializes the database: applies migrations and seeds development data.
/// Only seeds when the database is empty (safe for re-runs).
/// </summary>
public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider, IHostEnvironment environment)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AttendingDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AttendingDbContext>>();

        try
        {
            // Apply pending migrations (real SQL Server only)
            var isInMemory = context.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory";
            if (!isInMemory)
            {
                logger.LogInformation("Applying database migrations...");
                await context.Database.MigrateAsync();
                logger.LogInformation("Database migrations applied successfully");
            }
            else
            {
                await context.Database.EnsureCreatedAsync();
                logger.LogInformation("In-memory database created");
            }

            // Seed development data
            if (environment.IsDevelopment() || environment.EnvironmentName == "Testing")
            {
                await SeedDevelopmentDataAsync(context, logger);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while initializing the database");
            throw;
        }
    }

    private static async Task SeedDevelopmentDataAsync(AttendingDbContext context, ILogger logger)
    {
        // Only seed if empty
        if (await context.Users.AnyAsync())
        {
            logger.LogDebug("Database already seeded, skipping");
            return;
        }

        logger.LogInformation("Seeding development data...");

        // ============================================================
        // Provider (matches DevAuthHandler identity)
        // ============================================================
        var provider = User.Create(
            email: "scott.isbell@attending.ai",
            firstName: "Scott",
            lastName: "Isbell",
            role: UserRole.Provider,
            npi: "1234567890",
            specialty: "Family Medicine");
        context.Users.Add(provider);

        var nurse = User.Create(
            email: "jane.martinez@attending.ai",
            firstName: "Jane",
            lastName: "Martinez",
            role: UserRole.Nurse);
        context.Users.Add(nurse);

        var admin = User.Create(
            email: "admin@attending.ai",
            firstName: "System",
            lastName: "Admin",
            role: UserRole.Admin);
        context.Users.Add(admin);

        // ============================================================
        // Patients
        // ============================================================
        var patient1 = Patient.Create("MRN-2026-0001", "Maria", "Garcia", new DateTime(1985, 3, 15), "Female");
        context.Patients.Add(patient1);

        var patient2 = Patient.Create("MRN-2026-0002", "James", "Thompson", new DateTime(1958, 11, 22), "Male");
        context.Patients.Add(patient2);

        var patient3 = Patient.Create("MRN-2026-0003", "Aisha", "Patel", new DateTime(1992, 7, 4), "Female");
        context.Patients.Add(patient3);

        var patient4 = Patient.Create("MRN-2026-0004", "Robert", "Chen", new DateTime(1970, 1, 30), "Male");
        context.Patients.Add(patient4);

        var patient5 = Patient.Create("MRN-2026-0005", "Emily", "Nguyen", new DateTime(2001, 9, 12), "Female");
        context.Patients.Add(patient5);

        await context.SaveChangesAsync();

        // ============================================================
        // Allergies
        // ============================================================
        context.Allergies.AddRange(
            Allergy.Create(patient1.Id, "Penicillin", AllergySeverity.Severe, "Hives, anaphylaxis"),
            Allergy.Create(patient2.Id, "Sulfa drugs", AllergySeverity.Moderate, "Rash"),
            Allergy.Create(patient2.Id, "Aspirin", AllergySeverity.Severe, "GI bleeding"),
            Allergy.Create(patient4.Id, "Latex", AllergySeverity.Mild, "Contact dermatitis")
        );
        await context.SaveChangesAsync();

        // ============================================================
        // Medical Conditions
        // ============================================================
        context.MedicalConditions.AddRange(
            MedicalCondition.Create(patient1.Id, "E11.9", "Type 2 Diabetes Mellitus without complications", new DateTime(2019, 6, 1)),
            MedicalCondition.Create(patient1.Id, "I10", "Essential (primary) hypertension", new DateTime(2020, 2, 15)),
            MedicalCondition.Create(patient2.Id, "I25.10", "Atherosclerotic heart disease of native coronary artery", new DateTime(2016, 11, 1)),
            MedicalCondition.Create(patient2.Id, "I10", "Essential (primary) hypertension", new DateTime(2010, 3, 1)),
            MedicalCondition.Create(patient2.Id, "E78.5", "Hyperlipidemia, unspecified", new DateTime(2012, 7, 1)),
            MedicalCondition.Create(patient3.Id, "J45.20", "Mild intermittent asthma, uncomplicated", new DateTime(2015, 4, 1)),
            MedicalCondition.Create(patient4.Id, "E11.65", "Type 2 diabetes mellitus with hyperglycemia", new DateTime(2018, 9, 1)),
            MedicalCondition.Create(patient4.Id, "N18.3", "Chronic kidney disease, stage 3", new DateTime(2022, 1, 15))
        );
        await context.SaveChangesAsync();

        // ============================================================
        // Encounters (today's schedule)
        // ============================================================
        var today = DateTime.UtcNow.Date;

        var enc1 = Encounter.Create(patient1.Id, provider.Id, "Office Visit", today.AddHours(9));
        enc1.Start("Diabetes follow-up, A1c review");
        context.Encounters.Add(enc1);

        var enc2 = Encounter.Create(patient2.Id, provider.Id, "Office Visit", today.AddHours(10));
        enc2.Start("Chest pain on exertion, 2-week history");
        context.Encounters.Add(enc2);

        var enc3 = Encounter.Create(patient3.Id, provider.Id, "Office Visit", today.AddHours(11));
        context.Encounters.Add(enc3);

        var enc4 = Encounter.Create(patient4.Id, provider.Id, "Telehealth", today.AddHours(13));
        context.Encounters.Add(enc4);

        var enc5 = Encounter.Create(patient5.Id, provider.Id, "Office Visit", today.AddHours(14));
        context.Encounters.Add(enc5);

        await context.SaveChangesAsync();

        logger.LogInformation("Development data seeded: {Users} users, {Patients} patients, {Encounters} encounters",
            3, 5, 5);
    }
}
