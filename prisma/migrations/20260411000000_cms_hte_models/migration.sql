-- =============================================================================
-- ATTENDING AI - CMS HTE Models Migration
-- Adds IdentityVerification, PatientConsent, AIConversationReview, AIModelVersion
-- Required for CMS Health Technology Ecosystem certification (July 2026 deadline)
-- =============================================================================

BEGIN TRY

BEGIN TRAN;

-- CreateTable: IdentityVerification (IAL2 identity proofing from ID.me, CLEAR, login.gov)
CREATE TABLE [dbo].[IdentityVerification] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [providerSubject] NVARCHAR(1000) NOT NULL,
    [ialLevel] NVARCHAR(1000) NOT NULL,
    [verifiedAt] DATETIME2 NOT NULL,
    [expiresAt] DATETIME2,
    [lastUsedAt] DATETIME2 NOT NULL CONSTRAINT [IdentityVerification_lastUsedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [tokenHash] NVARCHAR(1000),
    [attributes] NVARCHAR(Max),
    [isActive] BIT NOT NULL CONSTRAINT [IdentityVerification_isActive_df] DEFAULT 1,
    [revokedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [IdentityVerification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [IdentityVerification_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [IdentityVerification_provider_providerSubject_key] UNIQUE NONCLUSTERED ([provider], [providerSubject])
);

-- CreateTable: PatientConsent (granular consent for FHIR data / AI analysis / network queries)
CREATE TABLE [dbo].[PatientConsent] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [consentType] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [PatientConsent_status_df] DEFAULT 'active',
    [dataCategories] NVARCHAR(Max) NOT NULL,
    [networkIds] NVARCHAR(Max),
    [purpose] NVARCHAR(1000),
    [grantedAt] DATETIME2 NOT NULL CONSTRAINT [PatientConsent_grantedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [revokedAt] DATETIME2,
    [expiresAt] DATETIME2,
    [grantedBy] NVARCHAR(1000) NOT NULL,
    [revokedBy] NVARCHAR(1000),
    [auditTrail] NVARCHAR(Max),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PatientConsent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PatientConsent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: AIConversationReview (clinician oversight of AI recommendations — CMS harm review)
CREATE TABLE [dbo].[AIConversationReview] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000),
    [encounterId] NVARCHAR(1000),
    [conversationId] NVARCHAR(1000) NOT NULL,
    [modelName] NVARCHAR(1000) NOT NULL,
    [modelVersion] NVARCHAR(1000) NOT NULL,
    [contentClassification] NVARCHAR(1000) NOT NULL,
    [confidenceScore] FLOAT(53),
    [recommendationType] NVARCHAR(1000),
    [recommendationSummary] NVARCHAR(Max),
    [reviewStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [AIConversationReview_reviewStatus_df] DEFAULT 'pending',
    [reviewedById] NVARCHAR(1000),
    [reviewedAt] DATETIME2,
    [reviewAction] NVARCHAR(1000),
    [reviewNotes] NVARCHAR(Max),
    [harmIndicators] NVARCHAR(Max),
    [safetyFlags] NVARCHAR(Max),
    [harmPotential] NVARCHAR(1000) NOT NULL CONSTRAINT [AIConversationReview_harmPotential_df] DEFAULT 'none',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AIConversationReview_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AIConversationReview_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AIConversationReview_conversationId_key] UNIQUE NONCLUSTERED ([conversationId])
);

-- CreateTable: AIModelVersion (model registry for NIST AI RMF / DiMe Seal compliance)
CREATE TABLE [dbo].[AIModelVersion] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [modelName] NVARCHAR(1000) NOT NULL,
    [version] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [capabilities] NVARCHAR(Max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [AIModelVersion_status_df] DEFAULT 'testing',
    [deployedAt] DATETIME2 NOT NULL CONSTRAINT [AIModelVersion_deployedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [retiredAt] DATETIME2,
    [validationData] NVARCHAR(Max),
    [biasAssessment] NVARCHAR(Max),
    [safetyRecord] NVARCHAR(Max),
    [approvedBy] NVARCHAR(1000),
    [approvalDate] DATETIME2,
    [reviewSchedule] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AIModelVersion_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AIModelVersion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AIModelVersion_organizationId_modelName_version_key] UNIQUE NONCLUSTERED ([organizationId], [modelName], [version])
);

-- CreateIndex: IdentityVerification
CREATE NONCLUSTERED INDEX [IdentityVerification_patientId_idx] ON [dbo].[IdentityVerification]([patientId]);
CREATE NONCLUSTERED INDEX [IdentityVerification_organizationId_idx] ON [dbo].[IdentityVerification]([organizationId]);
CREATE NONCLUSTERED INDEX [IdentityVerification_provider_idx] ON [dbo].[IdentityVerification]([provider]);
CREATE NONCLUSTERED INDEX [IdentityVerification_ialLevel_idx] ON [dbo].[IdentityVerification]([ialLevel]);
CREATE NONCLUSTERED INDEX [IdentityVerification_isActive_idx] ON [dbo].[IdentityVerification]([isActive]);

-- CreateIndex: PatientConsent
CREATE NONCLUSTERED INDEX [PatientConsent_patientId_idx] ON [dbo].[PatientConsent]([patientId]);
CREATE NONCLUSTERED INDEX [PatientConsent_organizationId_idx] ON [dbo].[PatientConsent]([organizationId]);
CREATE NONCLUSTERED INDEX [PatientConsent_consentType_idx] ON [dbo].[PatientConsent]([consentType]);
CREATE NONCLUSTERED INDEX [PatientConsent_status_idx] ON [dbo].[PatientConsent]([status]);
CREATE NONCLUSTERED INDEX [PatientConsent_patientId_consentType_status_idx] ON [dbo].[PatientConsent]([patientId], [consentType], [status]);

-- CreateIndex: AIConversationReview
CREATE NONCLUSTERED INDEX [AIConversationReview_organizationId_idx] ON [dbo].[AIConversationReview]([organizationId]);
CREATE NONCLUSTERED INDEX [AIConversationReview_patientId_idx] ON [dbo].[AIConversationReview]([patientId]);
CREATE NONCLUSTERED INDEX [AIConversationReview_reviewStatus_idx] ON [dbo].[AIConversationReview]([reviewStatus]);
CREATE NONCLUSTERED INDEX [AIConversationReview_harmPotential_idx] ON [dbo].[AIConversationReview]([harmPotential]);
CREATE NONCLUSTERED INDEX [AIConversationReview_createdAt_idx] ON [dbo].[AIConversationReview]([createdAt]);
CREATE NONCLUSTERED INDEX [AIConversationReview_reviewStatus_organizationId_idx] ON [dbo].[AIConversationReview]([reviewStatus], [organizationId]);

-- CreateIndex: AIModelVersion
CREATE NONCLUSTERED INDEX [AIModelVersion_organizationId_idx] ON [dbo].[AIModelVersion]([organizationId]);
CREATE NONCLUSTERED INDEX [AIModelVersion_modelName_idx] ON [dbo].[AIModelVersion]([modelName]);
CREATE NONCLUSTERED INDEX [AIModelVersion_status_idx] ON [dbo].[AIModelVersion]([status]);

-- AddForeignKey: IdentityVerification
ALTER TABLE [dbo].[IdentityVerification] ADD CONSTRAINT [IdentityVerification_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[IdentityVerification] ADD CONSTRAINT [IdentityVerification_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: PatientConsent
ALTER TABLE [dbo].[PatientConsent] ADD CONSTRAINT [PatientConsent_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PatientConsent] ADD CONSTRAINT [PatientConsent_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: AIConversationReview
ALTER TABLE [dbo].[AIConversationReview] ADD CONSTRAINT [AIConversationReview_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AIConversationReview] ADD CONSTRAINT [AIConversationReview_reviewedById_fkey] FOREIGN KEY ([reviewedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AIConversationReview] ADD CONSTRAINT [AIConversationReview_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: AIModelVersion
ALTER TABLE [dbo].[AIModelVersion] ADD CONSTRAINT [AIModelVersion_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
