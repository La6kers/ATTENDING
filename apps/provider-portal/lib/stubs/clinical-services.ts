// =============================================================================
// Stub: @attending/clinical-services
//
// This package is planned but not yet implemented as a workspace.
// These stubs allow the provider-portal to build while the real
// clinical-services package is developed.
// =============================================================================

export interface ProtocolResult {
  protocolId: string;
  name: string;
  source: string;
  lastUpdated: string;
  [key: string]: unknown;
}

export interface TriageInput {
  chiefComplaint: string;
  severity?: string;
  vitalSigns?: Record<string, number>;
  [key: string]: unknown;
}

export interface TriageResult {
  level: number;
  category: string;
  recommendation: string;
  [key: string]: unknown;
}

export interface RedFlagResult {
  flagId: string;
  description: string;
  severity: string;
  [key: string]: unknown;
}

export interface DifferentialResult {
  diagnosis: string;
  probability: number;
  [key: string]: unknown;
}

export interface LabResult {
  testName: string;
  value: number;
  unit: string;
  referenceRange: string;
  [key: string]: unknown;
}

export interface ClinicalSafetyCheck {
  safe: boolean;
  warnings: string[];
  [key: string]: unknown;
}

// Stub engines
export const clinicalProtocolEngine = {
  getProtocol(_id: string): ProtocolResult | null { return null; },
  getAllProtocols(): ProtocolResult[] { return []; },
};

export const triageClassifier = {
  classify(_input: TriageInput): TriageResult {
    return { level: 3, category: 'Urgent', recommendation: 'Clinical services module not yet available' };
  },
};

export const redFlagDetector = {
  detect(_symptoms: string[]): RedFlagResult[] { return []; },
  analyze(_data: unknown): RedFlagResult[] { return []; },
};

export const differentialEngine = {
  generate(_input: unknown): DifferentialResult[] { return []; },
};

export const labAnalyzer = {
  analyze(_results: unknown): LabResult[] { return []; },
  interpretResults(_data: unknown): LabResult[] { return []; },
};

export const clinicalSafetyChecker = {
  check(_data: unknown): ClinicalSafetyCheck { return { safe: true, warnings: [] }; },
  validateOrder(_order: unknown): ClinicalSafetyCheck { return { safe: true, warnings: [] }; },
};

// Default export for convenience
export default {
  clinicalProtocolEngine,
  triageClassifier,
  redFlagDetector,
  differentialEngine,
  labAnalyzer,
  clinicalSafetyChecker,
};
