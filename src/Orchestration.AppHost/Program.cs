var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.ClinicalIntake_API>("clinicalintake-api");

builder.Build().Run();
