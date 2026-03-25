// =============================================================================
// ATTENDING AI - FHIR Order Write-Back Service
// apps/shared/services/fhir-sync/FhirOrderService.ts
//
// Sends clinical orders from ATTENDING back to EHR systems
// Supports lab orders, imaging orders, referrals, and prescriptions
// =============================================================================

import { FhirClient, createFhirClient } from '../../lib/fhir';
import type {
  FhirClientConfig,
  FhirServiceRequest,
  FhirMedicationRequest,
  FhirCodeableConcept,
  FhirReference,
  FhirAnnotation,
  EhrVendor,
} from '../../lib/fhir/types';

// =============================================================================
// Types
// =============================================================================

export interface OrderCredentials {
  vendor: EhrVendor;
  baseUrl: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
  patientId: string;
  encounterId?: string;
  practitionerId?: string;
}

export interface LabOrderRequest {
  testCode: string;
  testName: string;
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  clinicalIndication?: string;
  notes?: string;
  specimenType?: string;
  fasting?: boolean;
}

export interface ImagingOrderRequest {
  studyCode: string;
  studyName: string;
  modality: string;
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  clinicalIndication: string;
  bodyRegion?: string;
  contrast?: boolean;
  notes?: string;
}

export interface ReferralRequest {
  specialty: string;
  specialtyCode?: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergent';
  preferredProvider?: string;
  notes?: string;
}

export interface PrescriptionRequest {
  medicationCode: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration?: string;
  quantity: number;
  refills: number;
  indication?: string;
  instructions?: string;
  dispenseAsWritten?: boolean;
}

export interface OrderResult {
  success: boolean;
  fhirId?: string;
  orderNumber?: string;
  status: string;
  error?: string;
}

// =============================================================================
// FHIR Order Service
// =============================================================================

export class FhirOrderService {
  private client: FhirClient;
  private credentials: OrderCredentials;

  constructor(credentials: OrderCredentials) {
    this.credentials = credentials;

    const config: FhirClientConfig = {
      ehr: {
        vendor: credentials.vendor,
        baseUrl: credentials.baseUrl,
        clientId: '',
        redirectUri: '',
        scopes: [],
      },
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenExpiresAt: credentials.tokenExpiresAt,
      patientId: credentials.patientId,
      encounterId: credentials.encounterId,
    };

    this.client = createFhirClient(config);
  }

  // ===========================================================================
  // Lab Orders
  // ===========================================================================

  async createLabOrder(order: LabOrderRequest): Promise<OrderResult> {
    try {
      const serviceRequest: FhirServiceRequest = {
        resourceType: 'ServiceRequest',
        status: 'active',
        intent: 'order',
        category: [this.createCodeableConcept('108252007', 'http://snomed.info/sct', 'Laboratory procedure')],
        priority: order.priority,
        code: this.createCodeableConcept(order.testCode, 'http://loinc.org', order.testName),
        subject: this.createPatientReference(),
        encounter: this.credentials.encounterId ? this.createEncounterReference() : undefined,
        authoredOn: new Date().toISOString(),
        requester: this.credentials.practitionerId ? this.createPractitionerReference() : undefined,
        reasonCode: order.clinicalIndication 
          ? [{ text: order.clinicalIndication }] 
          : undefined,
        note: order.notes ? [{ text: order.notes }] : undefined,
        specimen: order.specimenType 
          ? [{ display: order.specimenType }] 
          : undefined,
      };

      // Add fasting instruction if required
      if (order.fasting) {
        serviceRequest.patientInstruction = 'Patient must fast for 8-12 hours before specimen collection.';
      }

      const result = await this.client.create(serviceRequest);

      return {
        success: true,
        fhirId: result.id,
        orderNumber: result.identifier?.[0]?.value,
        status: result.status,
      };

    } catch (error: any) {
      console.error('[FhirOrderService] Lab order failed:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  // ===========================================================================
  // Imaging Orders
  // ===========================================================================

  async createImagingOrder(order: ImagingOrderRequest): Promise<OrderResult> {
    try {
      const serviceRequest: FhirServiceRequest = {
        resourceType: 'ServiceRequest',
        status: 'active',
        intent: 'order',
        category: [this.createCodeableConcept('363679005', 'http://snomed.info/sct', 'Imaging')],
        priority: order.priority,
        code: this.createCodeableConcept(
          order.studyCode, 
          'http://www.ama-assn.org/go/cpt', 
          order.studyName
        ),
        subject: this.createPatientReference(),
        encounter: this.credentials.encounterId ? this.createEncounterReference() : undefined,
        authoredOn: new Date().toISOString(),
        requester: this.credentials.practitionerId ? this.createPractitionerReference() : undefined,
        reasonCode: [{ text: order.clinicalIndication }],
        bodySite: order.bodyRegion 
          ? [{ text: order.bodyRegion }] 
          : undefined,
        note: this.buildImagingNotes(order),
      };

      const result = await this.client.create(serviceRequest);

      return {
        success: true,
        fhirId: result.id,
        orderNumber: result.identifier?.[0]?.value,
        status: result.status,
      };

    } catch (error: any) {
      console.error('[FhirOrderService] Imaging order failed:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  private buildImagingNotes(order: ImagingOrderRequest): FhirAnnotation[] {
    const notes: FhirAnnotation[] = [];
    
    if (order.contrast !== undefined) {
      notes.push({ text: `Contrast: ${order.contrast ? 'Yes' : 'No'}` });
    }
    
    if (order.modality) {
      notes.push({ text: `Modality: ${order.modality}` });
    }
    
    if (order.notes) {
      notes.push({ text: order.notes });
    }
    
    return notes.length > 0 ? notes : undefined as any;
  }

  // ===========================================================================
  // Referrals
  // ===========================================================================

  async createReferral(order: ReferralRequest): Promise<OrderResult> {
    try {
      const priorityMap: Record<string, 'routine' | 'urgent' | 'asap' | 'stat'> = {
        routine: 'routine',
        urgent: 'urgent',
        emergent: 'stat',
      };

      const serviceRequest: FhirServiceRequest = {
        resourceType: 'ServiceRequest',
        status: 'active',
        intent: 'order',
        category: [this.createCodeableConcept('3457005', 'http://snomed.info/sct', 'Patient referral')],
        priority: priorityMap[order.urgency],
        code: order.specialtyCode 
          ? this.createCodeableConcept(order.specialtyCode, 'http://snomed.info/sct', order.specialty)
          : { text: order.specialty },
        subject: this.createPatientReference(),
        encounter: this.credentials.encounterId ? this.createEncounterReference() : undefined,
        authoredOn: new Date().toISOString(),
        requester: this.credentials.practitionerId ? this.createPractitionerReference() : undefined,
        reasonCode: [{ text: order.reason }],
        performer: order.preferredProvider 
          ? [{ display: order.preferredProvider }] 
          : undefined,
        note: order.notes ? [{ text: order.notes }] : undefined,
      };

      const result = await this.client.create(serviceRequest);

      return {
        success: true,
        fhirId: result.id,
        orderNumber: result.identifier?.[0]?.value,
        status: result.status,
      };

    } catch (error: any) {
      console.error('[FhirOrderService] Referral failed:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  // ===========================================================================
  // Prescriptions (MedicationRequest)
  // ===========================================================================

  async createPrescription(order: PrescriptionRequest): Promise<OrderResult> {
    try {
      const medicationRequest: FhirMedicationRequest = {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: this.createCodeableConcept(
          order.medicationCode,
          'http://www.nlm.nih.gov/research/umls/rxnorm',
          order.medicationName
        ),
        subject: this.createPatientReference(),
        encounter: this.credentials.encounterId ? this.createEncounterReference() : undefined,
        authoredOn: new Date().toISOString(),
        requester: this.credentials.practitionerId ? this.createPractitionerReference() : undefined,
        reasonCode: order.indication ? [{ text: order.indication }] : undefined,
        dosageInstruction: [{
          text: `${order.dosage} ${order.route} ${order.frequency}`,
          route: { text: order.route },
          timing: {
            code: { text: order.frequency },
          },
          patientInstruction: order.instructions,
        }],
        dispenseRequest: {
          quantity: {
            value: order.quantity,
            unit: 'tablets', // Should be dynamic based on form
          },
          numberOfRepeatsAllowed: order.refills,
          validityPeriod: order.duration ? {
            start: new Date().toISOString().split('T')[0],
          } : undefined,
        },
        substitution: order.dispenseAsWritten ? {
          allowedBoolean: false,
        } : {
          allowedBoolean: true,
        },
      };

      const result = await this.client.create(medicationRequest);

      return {
        success: true,
        fhirId: result.id,
        orderNumber: result.identifier?.[0]?.value,
        status: result.status,
      };

    } catch (error: any) {
      console.error('[FhirOrderService] Prescription failed:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private createCodeableConcept(
    code: string, 
    system: string, 
    display: string
  ): FhirCodeableConcept {
    return {
      coding: [{
        system,
        code,
        display,
      }],
      text: display,
    };
  }

  private createPatientReference(): FhirReference {
    return {
      reference: `Patient/${this.credentials.patientId}`,
    };
  }

  private createEncounterReference(): FhirReference {
    return {
      reference: `Encounter/${this.credentials.encounterId}`,
    };
  }

  private createPractitionerReference(): FhirReference {
    return {
      reference: `Practitioner/${this.credentials.practitionerId}`,
    };
  }

  // ===========================================================================
  // Order Status Updates
  // ===========================================================================

  async cancelOrder(orderId: string, reason?: string): Promise<OrderResult> {
    try {
      const order = await this.client.read<FhirServiceRequest>('ServiceRequest', orderId);
      
      order.status = 'revoked';
      if (reason) {
        order.note = [...(order.note || []), { text: `Cancelled: ${reason}` }];
      }

      const result = await this.client.update(order);

      return {
        success: true,
        fhirId: result.id,
        status: result.status,
      };

    } catch (error: any) {
      console.error('[FhirOrderService] Cancel order failed:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  async getOrderStatus(orderId: string): Promise<{ status: string; lastUpdated?: string }> {
    try {
      const order = await this.client.read<FhirServiceRequest>('ServiceRequest', orderId);
      return {
        status: order.status,
        lastUpdated: order.meta?.lastUpdated,
      };
    } catch (error: any) {
      return {
        status: 'unknown',
      };
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createFhirOrderService(credentials: OrderCredentials): FhirOrderService {
  return new FhirOrderService(credentials);
}
